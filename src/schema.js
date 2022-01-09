// Default schema that discovers Lovelace cards from entity characteristics

export const GROUP_TOP_BUTTONS = "topbuttons";
export const GROUP_CLIMATE = "climate";
export const GROUP_CAMERAS = "cameras";
export const GROUP_SENSORS = "sensors";
export const GROUP_AUTOMATIONS = "automations";
export const GROUP_SCENES = "scenes";
export const GROUP_MEDIA_PLAYERS = "media";
export const GROUP_ALARM = "alarm";

// Schema to group entities together (e.g. entities card).
// Card within group definition determines how childs are grouped.
// Group without card specified = append childs directly to layout.
// Index controls order of additional to layout.
export const GROUP_SCHEMA = {
  [GROUP_CAMERAS]: {
    index: 1
  },
  [GROUP_TOP_BUTTONS]: {
    index: 2,
    card: {
      type: "grid",
      columns: 3
    }
  },
  [GROUP_ALARM]: {
    index: 3
  },
  [GROUP_MEDIA_PLAYERS]: {
    index: 4
  },
  [GROUP_CLIMATE]: {
    index: 5,
    card: {
      type: "entities",
      title: "Climate", // TODO: localize
      show_header_toggle: false,
      footer: {
        type: "graph",
        hours_to_show: 24,
        entity: [
          // lookup entity for footer graph
          {
            domain: "sensor",
            device_class: "temperature"
          },
          {
            domain: "sensor",
            device_class: "humidity"
          }
        ]
      }
    }
  },
  [GROUP_SCENES]: {
    index: 6,
    card: {
      type: "entities",
      title: "Scenes", // TODO: localize
      show_header_toggle: false
    }
  },
  [GROUP_SENSORS]: {
    index: 7,
    card: {
      type: "entities",
      title: "Sensors", // TODO: localize
      show_header_toggle: false
    }
  },
  [GROUP_AUTOMATIONS]: {
    id: GROUP_AUTOMATIONS,
    index: 8,
    card: {
      type: "entities",
      title: "Automations", // TODO: localize
      show_header_toggle: false
    }
  }
};

// Default card definitions
export const CARD_BUTTON = {
  type: "button",
  show_state: true,
  // apply card mod styling to the button to fix the padding issues of the HA button card
  // if card-mod not present it will use the HA default style
  // TODO: submit PR to frontend repo to fix the padding
  card_mod: {
    style:
      "span { padding-left: 5px; padding-right: 5px; font-size: 14px; font-weight: 400;}; .state {font-size: 10px; font-weight: 100; color: var(--secondary-text-color);}"
  }
};
export const CARD_PICTURE_ENTITY = {
  type: "picture-entity",
  show_state: false
};
export const CARD_MEDIA_CONTROL = {
  type: "media-control"
};
export const CARD_LIGHT = {
  type: "light"
};
export const CARD_ALARM_PANEL = {
  type: "alarm-panel"
};
export const CARD_SENSOR = {
  type: "sensor"
};
export const CARD_THERMOSTAT = {
  type: "thermostat"
};
export const CARD_ENTITY_ROW = {
  // regular entity row doesn't provide a type
  secondary_info: "last-updated"
};

// schema to discover entities to groups/cards
// NOTE: order is important as discovery happens top down and stops at the first match
export const DISCOVERY_SCHEMA = [
  {
    domain: "climate",
    card: CARD_ENTITY_ROW,
    group: GROUP_CLIMATE
  },
  {
    domain: "sensor",
    device_class: "temperature",
    card: CARD_ENTITY_ROW,
    group: GROUP_CLIMATE
  },
  {
    domain: "sensor",
    device_class: "humidity",
    card: CARD_ENTITY_ROW,
    group: GROUP_CLIMATE
  },
  {
    domain: "humidifier",
    card: CARD_ENTITY_ROW,
    group: GROUP_CLIMATE
  },
  {
    domain: "dehumidifier",
    card: CARD_ENTITY_ROW,
    group: GROUP_CLIMATE
  },
  {
    domain: "switch",
    entity_id: "*humidifier*",
    card: CARD_ENTITY_ROW,
    group: GROUP_CLIMATE
  },
  {
    domain: "sensor",
    entity_id: "*humidifier*",
    card: CARD_ENTITY_ROW,
    group: GROUP_CLIMATE
  },
  {
    domain: "light",
    card: CARD_BUTTON,
    group: GROUP_TOP_BUTTONS
  },
  {
    domain: "switch",
    card: CARD_BUTTON,
    group: GROUP_TOP_BUTTONS
  },
  {
    domain: "input_boolean",
    card: CARD_BUTTON,
    group: GROUP_TOP_BUTTONS
  },
  {
    domain: "button",
    card: CARD_BUTTON,
    group: GROUP_TOP_BUTTONS
  },
  {
    domain: "fan",
    card: CARD_BUTTON,
    group: GROUP_TOP_BUTTONS
  },
  {
    domain: "cover",
    card: CARD_BUTTON,
    group: GROUP_TOP_BUTTONS
  },
  {
    domain: "camera",
    card: CARD_PICTURE_ENTITY,
    group: GROUP_CAMERAS
  },
  {
    domain: "media_player",
    card: CARD_MEDIA_CONTROL,
    group: GROUP_MEDIA_PLAYERS
  },
  {
    domain: "automation",
    card: CARD_ENTITY_ROW,
    group: GROUP_AUTOMATIONS
  },
  {
    domain: "script",
    card: CARD_ENTITY_ROW,
    group: GROUP_AUTOMATIONS
  },
  {
    domain: "scene",
    card: CARD_ENTITY_ROW,
    group: GROUP_SCENES
  },
  {
    domain: "alarm_control_panel",
    card: CARD_ALARM_PANEL,
    group: GROUP_ALARM
  },
  {
    // fallback: all non matched entities land on the sensors (group) card
    card: CARD_ENTITY_ROW,
    group: GROUP_SENSORS
  }
];
