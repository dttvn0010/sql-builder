import { Modal } from 'react-bootstrap';
import { useSliceSelector, useSliceStore } from 'utils/reduxHelper';

export default function TableModal(){
  const store = useSliceStore('app');
  let [showTableModal, editingTable] = useSliceSelector('app', ['showTableModal', 'editingTable']);
  editingTable = editingTable ?? {};
  let fields = editingTable.fields ?? [];
  
  function hide(){
    store.setState({
      showTableModal: false
    })
  }

  function saveTable(){
    hide();
  }

  function setField(index, data) {
    let { editingTable } = store.getState();
    let fields = (editingTable?.fields ?? []);
    let field = fields[index];

    fields = [
      ...fields.slice(0, index),
      { ...field, ...data },
      ...fields.slice(index + 1),
    ];
    store.setState({
      editingTable: { ...editingTable, fields }
    });
  }

  function addField(index){
    let { editingTable } = store.getState();
    let fields = (editingTable?.fields ?? []);

    fields = [
      ...fields.slice(0, index),
      {
      },
      ...fields.slice(index),
    ];

    store.setState({
      editingTable: { ...editingTable, fields }
    });
  }

  function deleteField(index) {
    let { editingTable } = store.getState();
    let fields = (editingTable?.fields ?? []);

    fields = [
      ...fields.slice(0, index),
      ...fields.slice(index + 1),
    ];

    store.setState({
      editingTable: { ...editingTable, fields }
    });
  }

  return(
    <Modal size="lg" show={showTableModal} onHide={hide}>
      <Modal.Header closeButton>
        <Modal.Title>
          Table Structure
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row">
          <div className="col">
            <label className="mb-1">Table Name:</label>
            <input className="form-control"/>
          </div>
        </div>
        <div className="row mt-3">
          <div className="col">
            <h5><u>Field List:</u></h5>
          </div>
        </div>
        <table className="table table-bordered">
          <thead>
            <tr>
              <th style={{width: "23%"}}>Field</th>
              <th style={{width: "23%"}}>Type</th>
              <th style={{width: "17%"}}>Max length</th>
              <th style={{width: "23%"}}>Constraint</th>
              <th style={{width: "14%"}}></th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 &&
              <tr>
                <td colSpan="5">
                  No field added yet
                </td>
              </tr>
            }
            {fields.map((field, index) => 
              <tr key={index}>
                <td>
                  <input className="form-control"
                    value={field.name ?? ''}
                    onChange={e => setField(index, {name: e.target.value})}
                  />
                </td>
                <td>
                  <select className="form-control">
                    <option value="">----</option>
                    <option value="INT">Integer</option>
                    <option value="BOOL">Boolean</option>
                    <option value="FLOAT">Float</option>
                    <option value="STR">String</option>
                    <option value="DATE">Date</option>
                    <option value="DATE_TIME">DateTime</option>
                  </select>
                </td>
                <td>
                  <input type="number" min="0" className="form-control"/>
                </td>
                <td>
                  <select className="form-control">
                    <option value="">----</option>
                    <option value="PK">Primary Key</option>
                    <option value="NOT_NULL">Not null</option>
                    <option value="UNQ">Unique</option>
                  </select>
                </td>
                <td className="text-center">
                  <button className="btn btn-sm btn-primary" onClick={() => addField(index)}>
                    <i className="fas fa-plus"></i>
                  </button>
                  {" "}
                  <button className="btn btn-sm btn-danger" onClick={() => deleteField(index)}>
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <button className="btn btn-sm btn-primary" onClick={() => addField(fields.length)}>
          <i className="fas fa-plus"></i>
        </button>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-primary" onClick={saveTable}>
          Save
        </button>
      </Modal.Footer>
    </Modal>
  )
}