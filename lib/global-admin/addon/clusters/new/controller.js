import Controller from "@ember/controller";
import { inject as service } from "@ember/service";
import $ from "jquery";
export default Controller.extend({
  router: service(),
  queryParams: ["provider"],
  provider: null,
  step3: true,
  init() {
    this._super(...arguments);
    this.router.on("routeDidChange", transition => {
      if (transition.to && transition.to.params.provider) {
        this.set("provider", transition.to.params.provider);

        if (this.provider !== "import" || this.provider !== "custom") {
          this.set("step3", false);
        }
      }
    });
  }
});
