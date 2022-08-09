import React from 'react';
import { Tabs, Tab } from 'react-bootstrap';

import TableList from 'components/TableList';
import Diagram from 'components/Diagram';
import Fields from 'components/Fields';
import Conditions from 'components/Conditions';
import Query from 'components/Query';
import ConnectionModal from 'modals/ConnectionModal';

import "./App.css";
import { useSliceStore } from 'utils/reduxHelper';

export default function App(){
  const store = useSliceStore('app');

  function openConnectionModal(){
    const {connection} = store.getState();

    store.setState({
      editingConnection: connection ?? {},
      showConnectionModal: true
    });
  }

  return (
    <>
      <div id="container" className="row">
        <div className="col-3" style={{borderRight: "1px solid blue"}}>
          <div className="m-2">
            <button 
              className="btn btn-sm border-primary"
              onClick={openConnectionModal}
            >
              <i className="fas fa-edit"></i> Connection
            </button>
          </div>

          <TableList/>
        </div>

        <div className="col-9 px-0">
          <Tabs defaultActiveKey='diagram'
            onSelect={key => store.setState({activeTab: key})}
          >
            <Tab eventKey='diagram' title='Diagram'>
              <Diagram />
            </Tab>
            <Tab eventKey='fields' title='Fields'>
              <Fields />
            </Tab>
            <Tab eventKey='conditions' title='Conditions'>
              <Conditions />
            </Tab>
            <Tab eventKey='query' title='Query'>
              <Query />
            </Tab>
          </Tabs>
        </div>
      </div>
      <ConnectionModal/>
    </>
  );
}
