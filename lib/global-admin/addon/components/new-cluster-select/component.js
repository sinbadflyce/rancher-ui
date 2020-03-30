import Component from '@ember/component';
import layout from './template';
import {
  set, get, computed, setProperties, observer
} from '@ember/object';
import { loadStylesheet, proxifyUrl } from 'shared/utils/load-script';
import { inject as service } from '@ember/service';
export default Component.extend({
  intl:             service(),
  layout,
  needReloadSchema: false,
  reloadingSchema:  false,
  schemaReloaded:   false,
  actions:          {
    chooseProvider(id) {
      // eslint-disable-next-line ember/no-global-jquery
      $('#popup .launch-cluster .cluster-driver-box').removeClass('selected');
      // eslint-disable-next-line ember/no-global-jquery
      $(`#popup #${ id }`).addClass('selected');
    }
  },
  reloadSchema: observer('needReloadSchema', function() {
    if (!this.reloadingSchema && this.needReloadSchema) {
      set(this, 'reloadingSchema', true);

      this.globalStore
        .findAll('schema', {
          url:         '/v3/schemas',
          forceReload: true
        })
        .then(() => {
          setProperties(this, {
            schemaReloaded:  true,
            reloadingSchema: false
          });
        });
    }
  }),

  kontainerDrivers: computed(
    'model.kontainerDrivers.@each.{id,state}',
    function() {
      const chinaCloud = [
        'tencentkubernetesengine',
        'aliyunkubernetescontainerservice',
        'huaweicontainercloudengine'
      ];
      const nope = ['import', 'rancherkubernetesengine'];
      const kDrivers = get(this, 'model.kontainerDrivers') || [];
      const builtIn = kDrivers.filter(
        (d) => d.state === 'active' &&
          (d.builtIn || chinaCloud.indexOf(d.id) > -1) &&
          !nope.includes(d.id)
      );
      const custom = kDrivers.filter(
        (d) => d.state === 'active' && !d.builtIn && d.hasUi
      );

      return {
        builtIn,
        custom
      };
    }
  ),
  providerChoices: computed(
    'model.nodeDrivers.{id,state}',
    'schemaReloaded',
    'intl.locale',
    'kontainerDrivers.[]',
    function() {
      const { kontainerDrivers, intl } = this;
      const { builtIn, custom } = kontainerDrivers;

      let out = [
        {
          name:        'googlegke',
          driver:      'googlegke',
          kontainerId: 'googlekubernetesengine'
        },
        {
          name:        'amazoneks',
          driver:      'amazoneks',
          kontainerId: 'amazonelasticcontainerservice'
        },
        {
          name:        'azureaks',
          driver:      'azureaks',
          kontainerId: 'azurekubernetesservice'
        },
        {
          name:        'tencenttke',
          driver:      'tencenttke',
          kontainerId: 'tencentkubernetesengine'
        },
        {
          name:        'aliyunkcs',
          driver:      'aliyunkcs',
          kontainerId: 'aliyunkubernetescontainerservice'
        },
        {
          name:        'huaweicce',
          driver:      'huaweicce',
          kontainerId: 'huaweicontainercloudengine'
        }
      ];

      out = out.filter((o) => builtIn.findBy('id', o.kontainerId));

      if (custom.length > 0) {
        custom.forEach((c) => {
          const { name } = c;
          const configName = `${ name }EngineConfig`;
          const driverEngineSchema = this.globalStore.getById(
            'schema',
            configName.toLowerCase()
          );

          if (driverEngineSchema) {
            let {
              displayName,
              name: driver,
              id: kontainerId,
              name,
              genericIcon = true
            } = c;

            out.pushObject({
              displayName,
              driver,
              kontainerId,
              name,
              genericIcon
            });
          } else {
            set(this, 'needReloadSchema', true);
          }
        });
      }

      get(this, 'model.nodeDrivers')
        .filterBy('state', 'active')
        .sortBy('name')
        .forEach((driver) => {
          const {
            name, hasUi, hasBuiltinIconOnly: hasIcon, uiUrl
          } = driver;
          const configName = `${ name }Config`;
          const driverSchema = this.globalStore.getById(
            'schema',
            configName.toLowerCase()
          );

          if (uiUrl) {
            const cssUrl = proxifyUrl(
              uiUrl.replace(/\.js$/, '.css'),
              get(this, 'app.proxyEndpoint')
            );

            loadStylesheet(cssUrl, `driver-ui-css-${ name }`);
          }

          if (driverSchema) {
            out.push({
              name,
              driver:        'rke',
              genericIcon:   !hasUi && !hasIcon,
              nodeComponent: hasUi ? name : 'generic',
              nodeWhich:     name
            });
          } else {
            set(this, 'needReloadSchema', true);
          }
        }),
      out.push({
        name:      'custom',
        driver:    'rke',
        nodeWhich: 'custom',
        preSave:   true
      });

      out.push({
        name:    'import',
        driver:  'import',
        preSave: true
      });

      out.forEach((driver) => {
        const key = `clusterNew.${ driver.name }.label`;

        if (!get(driver, 'displayName') && intl.exists(key)) {
          set(driver, 'displayName', intl.t(key));
        }
      });

      out.sortBy('name');

      return out;
    }
  ),

  providerGroups: computed(
    'providerChoices.@each.{name,driver,nodeComponent,nodeWhich,preSave}',
    function() {
      const choices = get(this, 'providerChoices');
      const rkeGroup = [];
      const cloudGroup = [];
      const customGroup = [];
      const importGroup = [];

      choices.forEach((item) => {
        if (get(item, 'driver') === 'rke' && get(item, 'name') !== 'custom') {
          rkeGroup.pushObject(item);
        } else if (
          get(item, 'driver') === 'import' &&
          get(item, 'name') !== 'custom'
        ) {
          importGroup.pushObject(item);
        } else if (get(item, 'name') === 'custom') {
          customGroup.pushObject(item);
        } else {
          cloudGroup.pushObject(item);
        }
      });

      return {
        cloudGroup:  cloudGroup.sortBy('name'),
        customGroup: customGroup.sortBy('name'),
        importGroup: importGroup.sortBy('name'),
        rkeGroup:    rkeGroup.sortBy('name')
      };
    }
  )
});
