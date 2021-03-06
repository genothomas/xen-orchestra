import _ from 'intl'
import Component from 'base-component'
import Icon from 'icon'
import Link from 'link'
import NoObjects from 'no-objects'
import React from 'react'
import renderXoItem from 'render-xo-item'
import SortedTable from 'sorted-table'
import { Card, CardHeader, CardBlock } from 'card'
import { addSubscriptions, connectStore } from 'utils'
import { Container, Row, Col } from 'grid'
import { FormattedRelative, FormattedTime } from 'react-intl'
import { includes, map } from 'lodash'
import { deleteSnapshot, deleteSnapshots, subscribeSchedules } from 'xo'
import {
  createSelector,
  createGetObjectsOfType,
  createCollectionWrapper,
} from 'selectors'

const SNAPSHOT_COLUMNS = [
  {
    name: _('snapshotDate'),
    itemRenderer: snapshot => (
      <span>
        <FormattedTime
          day='numeric'
          hour='numeric'
          minute='numeric'
          month='long'
          value={snapshot.snapshot_time * 1000}
          year='numeric'
        />{' '}
        (<FormattedRelative value={snapshot.snapshot_time * 1000} />)
      </span>
    ),
    sortCriteria: 'snapshot_time',
    sortOrder: 'desc',
  },
  {
    name: _('vmNameLabel'),
    itemRenderer: renderXoItem,
    sortCriteria: 'name_label',
  },
  {
    name: _('vmNameDescription'),
    itemRenderer: snapshot => snapshot.name_description,
    sortCriteria: 'name_description',
  },
  {
    name: _('snapshotOf'),
    itemRenderer: (snapshot, { vms }) => {
      const vm = vms[snapshot.$snapshot_of]
      return vm && <Link to={`/vms/${vm.id}`}>{renderXoItem(vm)}</Link>
    },
    sortCriteria: (snapshot, { vms }) => {
      const vm = vms[snapshot.$snapshot_of]
      return vm && vm.name_label
    },
  },
]

const ACTIONS = [
  {
    label: _('deleteSnapshots'),
    individualLabel: _('deleteSnapshot'),
    icon: 'delete',
    level: 'danger',
    handler: deleteSnapshots,
    individualHandler: deleteSnapshot,
  },
]

@addSubscriptions({
  schedules: subscribeSchedules,
})
@connectStore(() => {
  const getSnapshots = createGetObjectsOfType('VM-snapshot')

  return {
    loneSnapshots: getSnapshots.filter(
      createSelector(
        createCollectionWrapper(
          (_, props) =>
            props.schedules !== undefined && map(props.schedules, 'id')
        ),
        scheduleIds =>
          scheduleIds
            ? _ => {
                const scheduleId = _.other['xo:backup:schedule']
                return (
                  scheduleId !== undefined && !includes(scheduleIds, scheduleId)
                )
              }
            : false
      )
    ),
    legacySnapshots: getSnapshots.filter([
      (() => {
        const RE = /^(?:XO_DELTA_EXPORT:|XO_DELTA_BASE_VM_SNAPSHOT_|rollingSnapshot_)/
        return (
          { name_label } // eslint-disable-line camelcase
        ) => RE.test(name_label)
      })(),
    ]),
    vms: createGetObjectsOfType('VM'),
  }
})
export default class Health extends Component {
  render() {
    return (
      <Container>
        <Row className='lone-snapshots'>
          <Col>
            <Card>
              <CardHeader>
                <Icon icon='vm' /> {_('vmSnapshotsRelatedToNonExistentBackups')}
              </CardHeader>
              <CardBlock>
                <NoObjects
                  actions={ACTIONS}
                  collection={this.props.loneSnapshots}
                  columns={SNAPSHOT_COLUMNS}
                  component={SortedTable}
                  data-vms={this.props.vms}
                  emptyMessage={_('noSnapshots')}
                  shortcutsTarget='.lone-snapshots'
                />
              </CardBlock>
            </Card>
          </Col>
        </Row>
        <Row className='legacy-snapshots'>
          <Col>
            <Card>
              <CardHeader>
                <Icon icon='vm' /> {_('legacySnapshots')}
              </CardHeader>
              <CardBlock>
                <NoObjects
                  actions={ACTIONS}
                  collection={this.props.legacySnapshots}
                  columns={SNAPSHOT_COLUMNS}
                  component={SortedTable}
                  data-vms={this.props.vms}
                  emptyMessage={_('noSnapshots')}
                  shortcutsTarget='.legacy-snapshots'
                />
              </CardBlock>
            </Card>
          </Col>
        </Row>
      </Container>
    )
  }
}
