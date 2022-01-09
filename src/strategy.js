import { findMatches, findMatch, findEntity, getCardDefinition } from "./utils";
import { CARD_SCHEMA, GROUP_SCHEMA } from "./schema";

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
        // assume primitive value
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
            // options: {
            //   cards: getViewOption(info.config, DEFAULT_ID, "cards", []),
            //   compact: getViewOption(info.config, DEFAULT_ID, "compact", false)
            // }
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
                  getViewOption(info.config, area.area_id, "exclude", [])
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

      // skip diagnostic/config entities
      const regEntity = entityReg.get(entity_id);
      if (regEntity) {
        if (["diagnostic", "config"].includes(regEntity.entity_category)) {
          continue;
        }
        // skip disabled entities
        if (regEntity.disabled_by) {
          continue;
        }
      }

      // parse domain and device_class from state
      const state = hass.states[entity_id];
      if (!state) {
        console.log("No state found for entity", entity_id);
        continue;
      }
      const domain = entity_id.split(".")[0];
      const device_class = state.attributes["device_class"];
      // work out entity name
      let name = state.attributes["friendly_name"];
      if (!name && regEntity) name = regEntity.name;
      if (!name) {
        console.warn('Unable to resolve name for entity', entity_id);
        continue;
      }
      
      // check if entity is excluded
      const searchNames = [domain, device_class, name, entity_id];
      if (findMatches(exclude, searchNames)) {
        continue;
      }

      // all checks passed, add entity to areaEntities
      areaEntities.push({
        entity_id: entity_id,
        domain: domain,
        name: name.replace(area.name, "").replace(area.name.toLowerCase(), ""),
        device_class: device_class
      });
    }

    return areaEntities;
  }

  static async generateView(info) {
    console.log("generateView", info);
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
      GROUP_SCHEMA
    );
    const card_schema = getViewOption(
      info.config,
      area.area_id,
      "card_schema",
      CARD_SCHEMA
    );
    console.log("group_schema", group_schema);
    console.log("card_schema", card_schema);
    const allCards = [];

    // area selector/header card
    allCards.push(await this.getHeaderCard(info.config, info.view));

    // discover cards from area entities
    const cardsPerGroup = {};
    for (const entity of areaEntities) {
      const cardDef = getCardDefinition(entity, card_schema);
      if (!cardDef || !cardDef.card) {
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

      // handle group with only one childcard ==> add single card directly to view
      if (groupDetails.card && cards.length === 1) {
        const cardType = cards[0].type ? cards[0].type : "entity";
        allCards.push({
          ...cards[0],
          index: groupDetails.index,
          type: cardType
        });
      }
      // entities grouped card (needs child cards in `entities` property)
      else if (groupDetails.card && groupDetails.card.type == "entities") {
        // optional footer details, lookup entity
        let footer = undefined;
        if (groupDetails.card.footer && groupDetails.card.footer.entity) {
          const footerEntity = findEntity(
            areaEntities,
            groupDetails.card.footer.entity
          );
          if (footerEntity) {
            footer = {
              ...groupDetails.card.footer,
              entity: footerEntity.entity_id
            };
          }
        }

        allCards.push({
          ...groupDetails.card,
          index: groupDetails.index,
          entities: cards,
          footer: footer
        });

        // other grouped cards (e.g. grid etc.) that need children in `cards` property
      } else if (groupDetails.card) {
        allCards.push({
          ...groupDetails.card,
          index: groupDetails.index,
          cards: cards
        });

        // single cards (e.g. media_player, camera)
      } else {
        // group without card definition = add cards directly to view
        for (const card of cards) {
          allCards.push({
            ...card,
            index: groupDetails.index
          });
        }
      }
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
    // const viewOptions = info.view.strategy.options;
    const extraCards = getViewOption(info.config, DEFAULT_ID, "cards", []);
    const compact = getViewOption(info.config, DEFAULT_ID, "compact", false);
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
          type: "button",
          entity: motion_entity,
          name: view.title,
          show_state: false,
          icon: view.icon,
          tap_action: {
            action: "navigate",
            navigation_path: view.path
          },
          // apply card mod styling to the button
          // if card-mod not present it will use the HA default style
          card_mod: {
            style:
              "span { padding-left: 5px; padding-right: 5px; font-size: 14px; font-weight: 400;}; .state {font-size: 10px; font-weight: 100; color: var(--secondary-text-color);}"
          }
        });
      }
      btnCards.sort((a, b) => a.name.localeCompare(b.name));
      allCards.push({ type: "grid", cards: btnCards });

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
