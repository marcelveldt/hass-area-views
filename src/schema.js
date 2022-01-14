// Default schemas for discovery of Lovelace cards from entity characteristics
import { matchEntity } from "./utils";

// Default group definitions
// Schema to group entities together (e.g. entities card).
// Card within group definition determines how childs are grouped.
// Group without card specified = append childs directly to layout.
// Index controls order within layout.
export const DEFAULT_GROUP_SCHEMA = {
  cameras: {
    index: 1
  },
  topbuttons: {
    index: 2,
    card: {
      type: "grid",
      columns: 3
    }
  },
  alarm: {
    index: 3
  },
  media: {
    index: 4
  },
  climate: {
    index: 5,
    title: "climate",
    card: {
      type: "entities",
      show_header_toggle: false
    },
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
  },
  scenes: {
    index: 6,
    title: "scenes",
    card: {
      type: "entities",
      show_header_toggle: false
    }
  },
  sensors: {
    index: 7,
    title: "sensors",
    card: {
      type: "entities",
      show_header_toggle: false
    },
    footer: {
      type: "graph",
      hours_to_show: 24,
      entity: [
        // lookup entity for footer graph
        {
          domain: "sensor",
          device_class: "illuminance"
        }
      ]
    }
  },
  automations: {
    index: 8,
    title: "automations",
    card: {
      type: "entities",
      show_header_toggle: false
    }
  }
};

// Some default (reusable) card definitions
export const DEFAULT_BUTTON_CARD = {
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
export const ENTITY_ROW = {
  // regular entity row doesn't provide a type
};
export const ENTITY_ROW_LAST_CHANGED = {
  ...ENTITY_ROW,
  secondary_info: "last-changed"
};
export const ENTITY_ROW_LAST_TRIGGERED = {
  ...ENTITY_ROW,
  secondary_info: "last-triggered"
};

// Default discovery schema
// schema to discover entities to groups/cards
// NOTE: order is important as discovery happens top down and stops at the first match
export const DEFAULT_DISCOVERY_SCHEMA = [
  {
    domain: "climate",
    card: ENTITY_ROW,
    group: "climate"
  },
  {
    domain: "sensor",
    device_class: "temperature",
    card: ENTITY_ROW_LAST_CHANGED,
    group: "climate"
  },
  {
    domain: "sensor",
    device_class: "humidity",
    card: ENTITY_ROW_LAST_CHANGED,
    group: "climate"
  },
  {
    domain: "humidifier",
    card: ENTITY_ROW,
    group: "climate"
  },
  {
    domain: "dehumidifier",
    card: ENTITY_ROW,
    group: "climate"
  },
  {
    domain: "switch",
    entity_id: "*humidifier*",
    card: ENTITY_ROW,
    group: "climate"
  },
  {
    domain: "sensor",
    entity_id: "*humidifier*",
    card: ENTITY_ROW_LAST_CHANGED,
    group: "climate"
  },
  {
    domain: "light",
    card: DEFAULT_BUTTON_CARD,
    group: "topbuttons"
  },
  {
    domain: "switch",
    card: DEFAULT_BUTTON_CARD,
    group: "topbuttons"
  },
  {
    domain: "input_boolean",
    card: DEFAULT_BUTTON_CARD,
    group: "topbuttons"
  },
  {
    domain: "button",
    card: DEFAULT_BUTTON_CARD,
    group: "topbuttons"
  },
  {
    domain: "fan",
    card: DEFAULT_BUTTON_CARD,
    group: "topbuttons"
  },
  {
    domain: "cover",
    card: DEFAULT_BUTTON_CARD,
    group: "topbuttons"
  },
  {
    domain: "camera",
    card: {
      type: "picture-entity",
      show_state: false,
      show_name: false
    },
    group: "cameras"
  },
  {
    domain: "media_player",
    card: {
    type: "media-control"
  },
    group: "media"
  },
  {
    domain: "automation",
    card: ENTITY_ROW_LAST_TRIGGERED,
    group: "automations"
  },
  {
    domain: "script",
    card: ENTITY_ROW_LAST_TRIGGERED,
    group: "automations"
  },
  {
    domain: "scene",
    card: ENTITY_ROW_LAST_TRIGGERED,
    group: "scenes"
  },
  {
    domain: "alarm_control_panel",
    card: {
      type: "alarm-panel"
    },
    group: "alarm"
  },
  // fallback: all non matched entities land on the sensors (group) card
  {
    domain: "binary_sensor",
    card: ENTITY_ROW_LAST_CHANGED,
    group: "sensors"
  },
  {
    domain: "sensor",
    card: ENTITY_ROW_LAST_CHANGED,
    group: "sensors"
  },
  {
    card: ENTITY_ROW,
    group: "sensors"
  }
];


// Default exclude schema
export const DEFAULT_EXCLUDE = [
  "device_tracker"
]

export function discover(entity, discovery_schema) {
  // discover Card/group definition from entity details
  for (const carddef of discovery_schema) {
    if (matchEntity(entity, carddef)) {
      return carddef;
    }
  }
  return null;
}
