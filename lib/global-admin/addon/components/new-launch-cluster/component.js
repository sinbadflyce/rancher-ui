import Component from '@ember/component';
import { set, get, setProperties } from '@ember/object';
import { inject as service } from '@ember/service';
import { hash } from 'rsvp';
import layout from './template';
export default Component.extend({
  globalStore:            service(),
  access:                 service(),
  settings:               service(),
  router:                 service('-routing'),
  roleTemplateService:    service('roleTemplate'),
  clusterTemplateService: service('clusterTemplates'),
  layout,
  record:                 null,
  step:                   1,
  loading:                true,
  _cachedClusterDetails:  null,
  init() {
    this._super(...arguments);
    this.initDataCreate();
  },
  actions: {
    close(saved) {
      if (this.close) {
        this.close(saved);
      }
    },

    done(saved){
      if (this.done) {
        this.done(saved);
      }
    },

    clusterDriverErrorAndTransition() {}
  },
  initDataCreate() {
    const gs = this.globalStore;

    const {
      clusterTemplates,
      clusterTemplateRevisions,
      kontainerDrivers,
      nodeDrivers
    } = get(this, 'model');

    let cluster = gs.createRecord({
      type: 'cluster',
      name: ''
    });
    const clusterTemplateRevision = get(this, 'clusterTemplateRevision');
    const originalClusterTemplateRevision = get(
      this,
      'clusterTemplateRevisions'
    );

    let ctr = null;
    let ct = null;
    let ctId = null;

    ctr = originalClusterTemplateRevision.findBy('id', clusterTemplateRevision);

    if (clusterTemplateRevision && ctr) {
      ctId = get(ctr, 'clusterTemplateId');
      let originalClusterTemplates = get(this, 'clusterTemplates');

      ct = originalClusterTemplates.findBy('id', ctId);

      setProperties(cluster, {
        clusterTemplateRevisionId: clusterTemplateRevision,
        clusterTemplateId:         get(ct, 'id')
      });

      this.clusterTemplateService.cloneAndPopulateClusterConfig(cluster, ctr);
    } else {
      if (
        cluster.clusterTemplateId &&
        cluster.clusterTemplateRevisionId &&
        !clusterTemplateRevision
      ) {
        // user deselected RKE Template
        setProperties(cluster, {
          clusterTemplateId:         null,
          clusterTemplateRevisionId: null
        });
      }
    }

    if (this._cachedClusterDetails) {
      set(cluster, 'name', this._cachedClusterDetails.name);
      set(this, '_cachedClusterDetails', null);
    }
    hash({
      cluster,
      kontainerDrivers,
      nodeDrivers,
      provider:                get(this, 'provider'),
      clusterTemplateRevision: ctr,
      roleTemplates:           get(
        this,
        'roleTemplateService'
      ).fetchFilteredRoleTemplates(),
      me:                         get(this, 'access.principal'),
      cloudCredentials:           gs.findAll('cloudcredential'),
      clusterRoleTemplateBinding: gs.findAll('clusterRoleTemplateBinding'),
      nodeTemplates:              gs.findAll('nodeTemplate'),
      psps:                       gs.findAll('podSecurityPolicyTemplate'),
      users:                      gs.findAll('user'),
      clusterTemplates,
      clusterTemplateRevisions
    }).then((item) => {
      set(this, 'record', item);
      set(this, 'loading', false);
    });
  }
});
