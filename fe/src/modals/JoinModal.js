import { Modal } from 'react-bootstrap';
import { deepCopy, useSliceSelector, useSliceStore } from 'utils/reduxHelper';

export default function JoinModal(){
  const store = useSliceStore('app');
  let [selectedTables, currentJoin, joinList, showJoinModal] = useSliceSelector('app', ['selectedTables', 'currentJoin', 'joinList', 'showJoinModal']);
  joinList = joinList ?? [];

  let dstTables = (selectedTables ?? []).filter(
    table => table.name !== currentJoin?.from?.tableName
  );

  let dstTable = dstTables.find(table => table.name === currentJoin?.to?.tableName);
  let fields = dstTable?.fields ?? [];
  
  fields = fields.filter(field => 
    !joinList
      .filter(join => join.to.tableName === dstTable?.name)
      .map(join => join.to.fieldName)
      .includes(field.name)
  );
  
  function onDstTableChange(e){
    let {currentJoin} = store.getState();
    currentJoin = deepCopy(currentJoin);
    currentJoin.to.tableName = e.target.value;
    currentJoin.to.fieldName = '';
    store.setState({currentJoin});
  }

  function onDstFieldChange(e) {
    let {currentJoin} = store.getState();
    currentJoin = deepCopy(currentJoin);
    currentJoin.to.fieldName = e.target.value;
    store.setState({currentJoin});
  }

  function hide(){
    store.setState({
      showJoinModal: false
    })
  }

  function saveJoin(){
    let {currentJoin, joinList} = store.getState();
    joinList = joinList ?? [];
    joinList = [...joinList, currentJoin];
    store.setState({joinList});
    hide();
  }

  if(!currentJoin) {
    return <></>;
  }

  return(
    <Modal size="md" show={showJoinModal} onHide={hide}>
      <Modal.Header closeButton>
        <Modal.Title>
          Join with another column
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="row">
          <div className="col-6">
            <select className="form-control"
              value={currentJoin.to.tableName}
              onChange={onDstTableChange}
            >
              <option value="">---Select Table---</option>
              {dstTables.map(table =>
                <option value={table.name} key={table.name}>
                  {table.name}
                </option>
              )}
            </select>
          </div>
          <div className="col-6">
            <select className="form-control"
              value={currentJoin.to.fieldName}
              onChange={onDstFieldChange}
            >
              <option value="">---Select Column---</option>
              {fields.map(field =>
                <option value={field.name} key={field.name}>
                  {field.name}
                </option>
              )}
            </select>
          </div>
        </div>

      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-primary" onClick={saveJoin}>
          Save
        </button>
      </Modal.Footer>
    </Modal>
  )
}