import { alias } from '@ember/object/computed';
import Component from '@ember/component';
import ModalBase from 'shared/mixins/modal-base';
import { inject as service } from '@ember/service';
import layout from './template';
import { set, get } from '@ember/object';
import { hash, hashSettled } from 'rsvp';
import {
  loadScript,
  loadStylesheet,
  proxifyUrl
} from 'shared/utils/load-script';

export default Component.extend(ModalBase, {
  globalStore:   service(),
  layout,
  classNames:    ['create-cluster'],
  editing:       true,
  tabSelect:     1,
  dataTemplate:  null,
  provider:      null,
  cluster:       null,
  model:         null,
  loading:       true,
  callback:      alias('modalService.modalOpts.callback'),
  namespace:     alias('modalService.modalOpts.namespace'),
  originalModel: alias('modalService.modalOpts.model'),
  loadUiPopup:   alias('modalService.modalOpts.loadUiPopup'),
  init() {
    this._super(...arguments);
  },
  didReceiveAttrs() {
    let model =  Object.assign({}, get(this, 'modalService.modalOpts.model'));

    hash(model).then((item) => {
      set(this, 'model', item);
      set(this, 'loading', false);
    });
    if (!this.loadUiPopup) {
      this.loadCssAndJsTemplate();
    }
  },
  actions: {
    doSave() {
      let callback = this.get('callback');

      if (callback) {
        callback(this.get('model'));
      }

      this.send('cancel');
    },
    doNext() {
      // eslint-disable-next-line ember/no-global-jquery
      var classTarget = $('.launch-cluster .cluster-driver-box.selected');

      if (classTarget.length === 0) {
        return;
      }
      let clusterTemplates = [];
      let clusterTemplateRevisions = [];
      const gs = this.globalStore;

      if (gs.getById('schema', 'clustertemplaterevision')) {
        clusterTemplates = gs.findAll('clustertemplate');
        clusterTemplateRevisions = gs.findAll('clustertemplaterevision');
      }
      set(this, 'originalModel.clusterTemplates', clusterTemplates);
      set(
        this,
        'originalModel.clusterTemplateRevisions',
        clusterTemplateRevisions
      );
      set(this, 'provider', classTarget.attr('id'));
      set(this, 'tabSelect', 2);
    },

    preSave(){
      set(this, 'tabSelect', 3);
    },
    done(){
      this.send('cancel');
      setTimeout(() => {
        get(this, 'router').transitionTo('global-admin.clusters.index');
      }, 2000);
    },
    doCancel() {
      this.send('cancel');
    }
  },
  loadCssAndJsTemplate() {
    // load the css/js url here, if the url loads fail we should error the driver out
    // show the driver in the ui, greyed out, and possibly add error text "can not load comonent from url [put url here]"

    let { kontainerDrivers } = this.clone;
    let externalDrivers = kontainerDrivers.filter(
      (d) => d.uiUrl !== '' && d.state === 'active'
    );
    let promises = {};

    externalDrivers.forEach((d) => {
      if (get(d, 'hasUi')) {
        const jsUrl = proxifyUrl(d.uiUrl, this.get('app.proxyEndpoint'));
        const cssUrl = proxifyUrl(
          d.uiUrl.replace(/\.js$/, '.css'),
          get(this, 'app.proxyEndpoint')
        );

        // skip setProperties cause of weird names
        set(
          promises,
          `${ d.name }Js`,
          loadScript(jsUrl, `driver-ui-js-${ d.name }`)
        );
        set(
          promises,
          `${ d.name }Css`,
          loadStylesheet(cssUrl, `driver-ui-css-${ d.name }`)
        );
      }
    });

    if (Object.keys(promises).length > 0) {
      return hashSettled(promises)
        .then((settled) => {
          let allkeys = Object.keys(settled);

          allkeys.forEach((key) => {
            if (get(settled, `${ key }.state`) === 'rejected') {
              let tmp =
                key.indexOf('Js') > -1
                  ? key.replace(/\Js$/, '')
                  : key.replace(/\Css$/, '');
              let match = kontainerDrivers.findBy('id', tmp);

              console.log('Error Loading External Component for: ', match);
              if (match && get(match, 'scriptError') !== true) {
                set(
                  match,
                  'scriptError',
                  get(this, 'intl').t('clusterNew.externalError')
                );
              }
            }
          });
        })
        .finally(() => {
          console.log('get data finally', this.model);
        });
    }
  }
});
