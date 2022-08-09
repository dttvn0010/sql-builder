import { Modal } from 'react-bootstrap';
import { useSliceSelector, useSliceStore } from 'utils/reduxHelper';
import { BASE_URL } from 'utils/constants';
//103.124.94.100

export default function ConnectionModal(){
  const store = useSliceStore('app');
  let [showConnectionModal, editingConnection] = useSliceSelector('app', ['showConnectionModal', 'editingConnection']);
  editingConnection = editingConnection ?? {};

  function setEditingConnection(data) {
    let {editingConnection} = store.getState();
    store.setState({
      editingConnection: {...editingConnection, ...data}
    });
  }

  async function saveConnection(){
    let {editingConnection} = store.getState();
    editingConnection = editingConnection ?? {};

    let url = BASE_URL + '/get-table-list';
    let data = new FormData();
    data.append("db_host", editingConnection.dbHost);
    data.append("db_user", editingConnection.dbUser);
    data.append("db_pass", editingConnection.dbPass);
    data.append("db_name", editingConnection.dbName);
    
    let resp = await fetch(url, {method: "POST", body: data});
    if(resp.status === 200) {
      let result = await resp.json();
      
      let tableList = (result ?? []).map(x => ({name: x}));
      
      store.setState({
        connection: editingConnection,
        tableList: tableList ?? [],
        joinList: [],
        selectedTables: [],
        conditionList: [],
        selectedFields: []
      });
      hide();
    }else{
      alert('Failed to connect!');
    }
  }

  function hide(){
    store.setState({
      showConnectionModal: false
    });
  }

  return(
    <Modal size="md" show={showConnectionModal} onHide={hide}>
      <Modal.Header closeButton>
        <Modal.Title>
          Table Structure
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row">
          <div className="col">
            <label className="mb-1">Database host:</label>
            <input className="form-control"
              value={editingConnection.dbHost ?? ''}
              onChange={e => setEditingConnection({dbHost: e.target.value})}
            />
          </div>
        </div>
        <div className="row mt-3">
          <div className="col">
            <label className="mb-1">Database user:</label>
            <input className="form-control"
              value={editingConnection.dbUser ?? ''}
              onChange={e => setEditingConnection({dbUser: e.target.value})}
            />
          </div>
        </div>
        <div className="row mt-3">
          <div className="col">
            <label className="mb-1">Database password:</label>
            <input type="password" className="form-control"
              value={editingConnection.dbPass ?? ''}
              onChange={e => setEditingConnection({dbPass: e.target.value})}
            />
          </div>
        </div>
        <div className="row mt-3">
          <div className="col">
            <label className="mb-1">Database name:</label>
            <input className="form-control"
              value={editingConnection.dbName ?? ''}
              onChange={e => setEditingConnection({dbName: e.target.value})}
            />
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-primary" onClick={saveConnection}>
          Save
        </button>
      </Modal.Footer>
    </Modal>
  );
}