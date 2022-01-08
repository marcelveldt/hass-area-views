# hass-area-views

Automatic Lovelace view generator for your Home Assistant Area's.
Early version, both development and documentation is WIP!

*This is NOT a custom Lovelace Card, it's an automatic Lovelace dashboard generator.*
Based on your Home Assistant Area's and devices/entities in it or related to it,
views will be generated (and automatically updated).

All you need is a few lines of code and you'll have a friendly to use dashboard for your family members.


# Installation and getting started

### 1) Download and install the `area-views.js` javascript module.

The easiest way 
For installation instructions [see this guide](https://github.com/thomasloven/hass-config/wiki/Lovelace-Plugins).

```Don't forget to actually load the plugin in Lovelace. (Settings--> Dashboards--> Sources)```

### 2) Create a new/empty Lovelace dashboard.

#### Lovelace in UI mode (default):

- Settings --> Dashboards --> Create new --> Name it Areas (or whatever you want).
- Click OPEN on your newly created Dashboard to navigate to the HA Dashboard.
- Once on the new dashboard (which is prefiled with default content), click the 3 dots in the top right corner.
- Choose configure UI --> Make sure that 'Start with an empty dashboard' is checked --> Click Take over.
- Click the 3 dots again and choose 'Raw configuration editor'. In the editor that appears, remove all content and paste the below minimal example:

```
strategy:
  type: custom:area-views
views: []
```

- Hit save and refresh the page
- You should now see your auto generated Lovelace dashboard with views for each of your area's.

#### Lovelace in yaml mode:

You'll need to add the extra dashboard and initial config in your yaml 
