import { LitElement, html } from "lit-element";

export class AreaHeader extends LitElement {
  render() {
    return html`
      <style>
        table.header {
          cursor: pointer;
          width: 100%;
          font-weight: 400px;
          font-size: var(--app-toolbar-font-size, 20px);
          --mdc-icon-size: 32px;
        }
        div.itemslist {
          background-color: var(--sidebar-background-color);
        }
        paper-item {
          cursor: pointer;
        }
      </style>
      <div>
        <table
          class="header"
          style="width:100%"
          @click="${this._headerClicked}"
        >
          <tr>
            <td width="10%">
              <ha-icon icon="${this.current.icon}"></ha-icon>
            </td>
            <td width="80%">
              <div style="margin-left:10px">${this.current.name}</div>
            </td>
            <td width="10%">
              <ha-icon icon="mdi:menu-open"></ha-icon>
            </td>
          </tr>
        </table>
        <div class="itemslist" id="areaSelect" ?hidden="${!this.showAreas}">
          ${this.options
            .filter((x) => x.path != this.current.path)
            .map(
              (x) => html`
                <paper-item @click="${() => this._itemClicked(x.path)}">
                  <ha-icon icon="${x.icon}"></ha-icon>
                  <span style="margin-left: 20px">${x.name}</span>
                </paper-item>
              `
            )}
        </div>
      </div>
    `;
  }
  setConfig(config) {
    this.options = config.options;
    this.current = config.current;
    this.disableMenu = config.disable_menu;
    this.showAreas = false;
  }

  async _itemClicked(key) {
    // area/item clicked in the list
    this.showAreas = false;
    this._navigate(key);
  }

  async _headerClicked(ev) {
    // header is clicked
    if (this.disableMenu) {
      // navigate to home
      this._navigate(0);
    } else {
      // show dropdown menu with areas/views
      this.showAreas = !this.showAreas;
      this.requestUpdate();
    }
  }

  async _navigate(path) {
    history.pushState(null, "", path);
    const event = new Event("location-changed", {
      bubbles: true,
      cancelable: false,
      composed: true
    });
    event.detail = {};
    window.dispatchEvent(event);
  }

  getCardSize() {
    return 1;
  }
}
