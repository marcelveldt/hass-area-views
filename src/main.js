import { AreaViewsStrategy } from "./strategy";
import { AreaHeader } from "./cards/header";
import pjson from "../package.json";

if (!customElements.get("ll-strategy-area-views")) {
  customElements.define("ll-strategy-area-views", AreaViewsStrategy);
  customElements.define("area-header", AreaHeader);
  /* eslint no-console: 0 */
  console.info(
    `%c  AREA-VIEWS  \n%c Version ${pjson.version} `,
    "color: orange; font-weight: bold; background: black",
    "color: white; font-weight: bold; background: dimgray"
  );
}
