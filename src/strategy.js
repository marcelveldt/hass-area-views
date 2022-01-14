import {
  findMatches,
  findMatch,
  findEntity,
  cleanupString,
  getLocalizedString
} from "./utils";
import {
  DEFAULT_BUTTON_CARD,
  DEFAULT_DISCOVERY_SCHEMA,
  DEFAULT_EXCLUDE,
  DEFAULT_GROUP_SCHEMA,
  discover
} from "./schema";

const DEFAULT_ID = "default_view";

function getViewOption(config, viewPath, key, defaultValue) {
  // lookup value for key in view-specific and/or global config
  // fallback to given default
  // arrays and objects will be merged
  if (defaultValue === undefined) {
    throw `No defaultValue given for ${key}`;
  }
  const globalConf = config.strategy;
  const areaConf = getViewConfig(config, viewPath);
  const globalVal = globalConf[key];
  const areaVal = areaConf[key];
  let result = defaultValue;

  for (const val of [globalVal, areaVal]) {
    try {
      if (val !== undefined && Array.isArray(val)) {
        if (result.length === 0) {
          result = val;
        } else {
          // append to array
          result = Array.from(new Set(result.concat(val)));
        }
      } else if (val !== undefined && typeof val === "object") {
        // merge objects
        result = { ...result, ...val };
      } else if (val !== undefined) {
        // assume primitive type
        result = val;
      }
    } catch {
      console.error("Error while processing configuration", key);
    }
  }
  return result;
}
function getViewConfig(config, viewPath) {
  // return view/area specific config (if any)
  return (
    config.views.find((x) => {
      return x.path == viewPath;
    }) || {}
  );
}

export class AreaViewsStrategy {
  static async generateDashboard(info) {
    // Retrieve Area and Entity registry
    const [areas, entities] = await Promise.all([
      info.hass.callWS({ type: "config/area_registry/list" }),
      info.hass.callWS({ type: "config/entity_registry/list" })
    ]);
    // create map of entity registry for easier lookups
    const entityReg = new Map();
    for (const entity of entities) {
      entityReg.set(entity.entity_id, entity);
    }

    return {
      // include/copy full config as base for custom components etc.
      ...info.config,
      // supply views from all areas + dashboard/home
      views: [
        {
          // homepage
          ...getViewConfig(info.config, DEFAULT_ID),
          strategy: {
            type: "custom:area-views"
          },
          title: getViewOption(info.config, DEFAULT_ID, "title", "Home"),
          icon: getViewOption(
            info.config,
            DEFAULT_ID,
            "icon",
            "mdi:home-assistant"
          ),
          path: DEFAULT_ID
        },
        // views per areas
        ...areas
          .map((area) => ({
            ...getViewConfig(info.config, area.area_id),
            strategy: {
              type: "custom:area-views",
              options: {
                area,
                entities: this.getAreaEntities(
                  info.hass,
                  area,
                  entityReg,
                  getViewOption(info.config, area.area_id, "include", []),
                  getViewOption(info.config, area.area_id, "exclude", DEFAULT_EXCLUDE)
                )
              }
            },
            title: getViewOption(info.config, area.area_id, "title", area.name),
            icon: getViewOption(
              info.config,
              area.area_id,
              "icon",
              "mdi:home-assistant"
            ),
            path: area.area_id
          }))
          .sort((a, b) => a.title.localeCompare(b.title)),
        // append any user given views at the end
        ...info.config.views.filter(
          (x) =>
            !x.path === DEFAULT_ID && !areas.find((y) => y.area_id == x.path)
        )
      ]
    };
  }

  static async getAreaEntities(hass, area, entityReg, include, exclude) {
    // use the related entities server call to figure out all entities for this area
    const relatedEntities = await hass.callWS({
      type: "search/related",
      item_type: "area",
      item_id: area.area_id
    });

    // make sure that entities is a set to filter duplicates
    const entityIds = new Set();
    for (const key of ["entity", "automation", "script", "scene"]) {
      if (relatedEntities[key] !== undefined) {
        relatedEntities[key].forEach((item) => entityIds.add(item));
      }
    }

    // append (non entitity registry) entities given by include config param
    for (const entityPattern of include) {
      if (hass.states.hasOwnProperty(entityPattern)) {
        entityIds.add(entityPattern);
      } else {
        // wildcard given in pattern, lookup the hard way
        for (const entity_id in hass.states) {
          if (findMatch(entityPattern, entity_id)) {
            entityIds.add(entity_id);
          }
        }
      }
    }

    const areaEntities = [];
    for (const entity_id of entityIds) {
      // skip if entity not in hass.states
      if (!entity_id in hass.states) continue;

      
      const regEntity = entityReg.get(entity_id);
      if (regEntity) {

        // skip diagnostic/config entities
        if (["diagnostic", "config"].includes(regEntity.entity_category)) {
          continue;
        }
        // skip disabled entities
        if (regEntity.disabled_by) {
          continue;
        }
        // skip if area doesn't match somehow
        if (regEntity.area_id && regEntity.area_id != area.area_id) {
          continue;
        }
      }

      // parse domain and device_class from state
      const state = hass.states[entity_id];
      if (!state) {
        console.warn("No state found for entity", entity_id);
        continue;
      }
      const domain = entity_id.split(".")[0];
      const device_class = state.attributes["device_class"];
      // work out entity name
      let name = state.attributes["friendly_name"];
      if (!name) {
        console.warn("Unable to resolve name for entity", entity_id);
        continue;
      }

      // check if entity is excluded
      const searchNames = [domain, device_class, name, entity_id];
      if (findMatches(exclude, searchNames)) {
        continue;
      }

      // create pretty name for the entity (strip area)
      name = cleanupString(name, area.name);

      // all checks passed, add entity to areaEntities
      areaEntities.push({
        entity_id: entity_id,
        domain: domain,
        name: name,
        device_class: device_class
      });
    }

    return areaEntities;
  }

  static async generateView(info) {
    if (info.view.path === DEFAULT_ID) {
      return await this.generateHomeView(info);
    }

    const area = info.view.strategy.options.area;
    const areaEntities = await info.view.strategy.options.entities;
    const extraCards = getViewOption(info.config, area.area_id, "cards", []);
    const group_schema = getViewOption(
      info.config,
      area.area_id,
      "group_schema",
      DEFAULT_GROUP_SCHEMA
    );

    // TODO: fill custom discovery schema from include config
    const custom_discovery_schema = [];

    const allCards = [];

    // area selector/header card
    allCards.push(await this.getHeaderCard(info.config, info.view));

    // discover cards from area entities
    const cardsPerGroup = {};
    for (const entity of areaEntities) {
      const cardDef = discover(entity, [
        ...custom_discovery_schema,
        ...DEFAULT_DISCOVERY_SCHEMA
      ]);
      if (!cardDef) {
        throw `Unable to detect card definition for entity ${entity.entity_id}`;
      }
      const card = {
        ...cardDef.card,
        name: entity.name,
        entity: entity.entity_id
      };
      if (cardDef.group in cardsPerGroup) {
        cardsPerGroup[cardDef.group].push(card);
      } else {
        cardsPerGroup[cardDef.group] = [card];
      }
    }

    // sort all cards for each group and insert into layout
    for (const groupId in cardsPerGroup) {
      const cards = cardsPerGroup[groupId].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      const groupDetails = group_schema[groupId];
      if (!groupDetails) {
        throw `Unable to detect group definition for group ${groupId}`;
      }

      // // group without card definition or group with only one childcard
      // // add cards directly to view
      // if (
      //   !groupDetails.card ||
      //   !card_schema[groupDetails.card] ||
      //   cards.length === 1
      // ) {
      //   for (const card of cards) {
      //     allCards.push({
      //       ...card,
      //       index: groupDetails.index
      //     });
      //   }
      //   continue;
      // }

      // group without card definition: add cards directly to view
      if (!groupDetails.card) {
        for (const card of cards) {
          allCards.push({
            ...card,
            index: groupDetails.index
          });
        }
        continue;
      }

      const groupCard = { ...groupDetails.card };
      if (groupCard.type === "entities") {
        // entities grouped card
        // needs child cards in `entities` property
        groupCard["entities"] = cards;
      } else {
        // other grouped cards (e.g. grid etc.) that need children in `cards` property
        groupCard["cards"] = cards;
      }
      // handle optional footer
      if (groupDetails.footer) {
        const footerEntity = findEntity(
          areaEntities,
          groupDetails.footer.entity
        );
        if (footerEntity) {
          groupCard["footer"] = {
            ...groupDetails.footer,
            entity: footerEntity.entity_id
          };
        }
      }
      // handle optional title
      if (groupDetails.title) {
        groupCard["title"] = getLocalizedString(
          groupDetails.title,
          info.hass.locale.language
        );
      }

      allCards.push({
        ...groupCard,
        index: groupDetails.index,
        entities: cards
      });
    }

    // insert any user given cards
    allCards.push(...extraCards);

    return {
      // return the final sorted result
      cards: allCards.sort((a, b) => a.index - b.index)
    };
  }
  static async generateHomeView(info) {
    // create home screen / dashboard with all areas
    const extraCards = getViewOption(info.config, DEFAULT_ID, "cards", []);
    const compact = getViewOption(info.config, DEFAULT_ID, "compact", false);
    const group_schema = getViewOption(
      info.config,
      DEFAULT_ID,
      "group_schema",
      DEFAULT_GROUP_SCHEMA
    );
    const allCards = [];

    // area selector/header card
    allCards.push(await this.getHeaderCard(info.config, info.view));

    // grid with button cards for all areas/views
    // only if compact mode enabled
    if (compact) {
      const btnCards = [];
      for (const view of info.config.views) {
        if (view.path == DEFAULT_ID) continue;
        if (view.strategy === undefined) continue;
        const areaEntities = await view.strategy.options.entities;
        // lookup motion sensor
        let motion_entity = view.strategy.options.motion_entity;
        if (!motion_entity) {
          const motion_sensors = areaEntities.filter(
            (x) => x.device_class == "motion"
          );
          if (motion_sensors.length > 0)
            motion_entity = motion_sensors[0].entity_id;
        }
        // fallback to door/window sensor
        if (!motion_entity) {
          const door_sensors = areaEntities.filter(
            (x) => x.device_class == "door" || x.device_class == "window"
          );
          if (door_sensors.length > 0) {
            motion_entity = door_sensors[0].entity_id;
          }
        }
        btnCards.push({
          ...DEFAULT_BUTTON_CARD,
          entity: motion_entity,
          name: view.title,
          show_state: false,
          icon: view.icon,
          tap_action: {
            action: "navigate",
            navigation_path: view.path
          }
        });
      }
      btnCards.sort((a, b) => a.name.localeCompare(b.name));
      const groupDef = group_schema["topbuttons"];
      allCards.push({ ...groupDef.card, cards: btnCards });

      // default: large area cards for each view/area
    } else {
      for (const view of info.config.views) {
        if (view.path == DEFAULT_ID) continue;
        allCards.push({
          type: "area",
          area: view.path,
          show_camera: true,
          navigation_path: view.path
        });
      }
    }

    // insert any user given cards
    for (const card of extraCards) {
      allCards.splice(card.index || 99, 0, card);
    }
    return {
      cards: allCards
    };
  }
  static async getHeaderCard(config, curView) {
    // view selector/header card
    const selectOptions = [];
    for (const view of config.views) {
      selectOptions.push({
        name: view.title,
        icon: view.icon,
        path: view.path
      });
    }
    return {
      type: "custom:area-header",
      options: selectOptions,
      current: {
        name: curView.title,
        icon: curView.icon,
        path: curView.path
      },
      disable_menu: getViewOption(config, curView.path, "disable_menu", false)
    };
  }
}
