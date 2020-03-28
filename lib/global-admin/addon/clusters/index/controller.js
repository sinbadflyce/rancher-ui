import { inject as service } from '@ember/service';
import Controller, { inject as controller } from '@ember/controller';
import { getOwner } from '@ember/application';
import { get, set } from '@ember/object';
const headers = [
  {
    name:           'state',
    sort:           ['sortState', 'name', 'id'],
    translationKey: 'generic.state',
    width:          125,
  },
  {
    name:           'name',
    searchField:    'displayName',
    sort:           ['displayName', 'id'],
    translationKey: 'clustersPage.cluster.label',
  },
  {
    name:           'provider',
    searchField:    'displayProvider',
    sort:           ['displayProvider', 'name', 'id'],
    translationKey: 'clustersPage.provider.label',
    width:          150,
  },
  {
    name:           'nodes',
    searchField:    'nodes.length',
    sort:           ['nodes.length', 'name', 'id'],
    translationKey: 'clustersPage.nodes.label',
    width:          100,
  },
  {
    name:           'cpu',
    sort:           ['cpuUsage', 'name'],
    searchField:    'cpuUsage',
    translationKey: 'clustersPage.cpu.label',
    width:          100,
  },
  {
    name:           'memory',
    searchField:    'memoryUsage',
    sort:           ['memoryUsage', 'name'],
    translationKey: 'clustersPage.memory.label',
    width:          125,
  }
];

const NODE_SEARCH_FIELDS = ['displayName', 'externalIpAddress:ip', 'ipAddress:ip'];

export default Controller.extend({
  modalService:       service('modal'),
  globalStore:  service(),
  access:             service(),
  scope:              service(),
  settings:           service(),
  prefs:              service(),
  router:             service(),

  application:        controller(),
  queryParams:        ['mode'],
  mode:               'grouped',
  clusterTemplate:   null,
  headers,
  extraSearchFields:  ['version.gitVersion'],
  sortBy:             'name',
  searchText:         null,
  bulkActions:        true,

  extraSearchSubFields: NODE_SEARCH_FIELDS,
  init() {
    this._super(...arguments);
    set(this, 'clusterTemplate', {
      kontainerDrivers:         gs.findAll('kontainerdriver'),
      nodeDrivers:              gs.findAll('nodeDriver'),
      clusterTemplates:         gs.findAll('clustertemplate'),
      clusterTemplateRevisions: gs.findAll('clustertemplaterevision')
    });
  },

  actions: {
    launchOnCluster(model) {
      let authenticated = getOwner(this).lookup('route:authenticated');

      if (this.get('scope.currentProject.id') === model.get('defaultProject.id')) {
        this.transitionToRoute('authenticated.host-templates', {
          queryParams: {
            clusterId: model.get('id'),
            backTo:    'clusters'
          }
        });
      } else {
        authenticated.send('switchProject', model.get('defaultProject.id'), 'authenticated.host-templates', [model.id, { queryParams: { backTo: 'clusters' } }]);
      }
    },
    showNewCluster() {
      set(this, 'loadUiPopup', true);

      this.get('modalService').toggleModal('modal-new-cluster', {
        model:       get(this, 'clusterTemplate'),
        loadUiPopup: get(this, 'loadUiPopup')
      });
    },
    useKubernetes(model) {
      let authenticated = getOwner(this).lookup('route:authenticated');

      authenticated.send('switchProject', model.get('defaultProject.id'), 'authenticated.cluster.import', [model.id, { queryParams: { backTo: 'clusters' } }]);
    },
  },
});
