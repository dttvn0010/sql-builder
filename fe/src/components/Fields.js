import { useSliceSelector, useSliceStore, deepCopy } from 'utils/reduxHelper';

export default function Fields(){
  const store = useSliceStore('app');
  let [connection, selectedTables, selectedFields] = useSliceSelector('app', 
      ['connection', 'selectedTables', 'selectedFields']);

  selectedFields = selectedFields ?? [];
  let tableMap = {};
  (selectedTables ?? []).forEach(table => tableMap[table.name] = table);

  function setField(index, data){
    let {selectedFields} = store.getState();
    selectedFields = deepCopy(selectedFields ?? []);
    selectedFields[index] = {...selectedFields[index], ...data};
    store.setState({selectedFields});
  }

  function addField(index) {
    let {selectedFields} = store.getState();
    selectedFields = deepCopy(selectedFields ?? []);
    selectedFields.splice(index, 0, {});
    store.setState({selectedFields});
  }

  function deleteField(index) {
    let {selectedFields} = store.getState();
    selectedFields = deepCopy(selectedFields ?? []);
    selectedFields.splice(index, 1);
    store.setState({selectedFields});
  }

  if(!connection){
    return <div className="p-3">Please connect to a database first.</div>;
  }

  return (
  <div className='p-3'>
    <h4><u>Selected Fields</u></h4>
    <table className='table'>
      <thead>
        <tr>
          <th style={{width: "40%"}} className="text-center">Field</th>
          <th style={{width: "7%"}} className="text-center">Group by</th>
          <th style={{width: "10%"}} className="text-center">Agg method</th>
          <th style={{width: "15%"}} className="text-center">Alias</th>
          <th style={{width: "10%"}} className="text-center">Order by</th>
          <th style={{width: "7%"}} className="text-center">Order priority</th>
          <th style={{width: "10%"}} ></th>
        </tr>
      </thead>
      <tbody>
        {selectedFields.length === 0 &&
          <tr>
            <th colSpan="5">
              <td>No field selected yet.</td>
            </th>
          </tr>
        }
        {selectedFields.map((field,index) => 
          <tr key={index}>
            <td className="pb-1">
              <div className="row">
                {!field.isCustom &&
                  <>
                    <div className="col-6">
                      <select className='form-control'
                        value={field.tableName ?? ''}
                        onChange={e => setField(index, {tableName: e.target.value})}
                      >
                        <option value="">---Table---</option>
                        {selectedTables.map(table =>
                          <option value={table.name} key={table.name}>{table.name}</option>
                        )}
                      </select>
                    </div>
                    <div className="col-6">
                      <select className='form-control'
                        value={field.colName ?? ''}
                        onChange={e => setField(index, {colName: e.target.value})}
                      >
                        <option value="">---Column---</option>
                        {field.tableName && tableMap[field.tableName]?.fields.map(field2 =>
                          <option value={field2.name} key={field2.name}>{field2.name}</option>
                        )}
                      </select>
                    </div>
                  </>
                }
                {field.isCustom &&
                  <div className="col">
                    <input className="form-control" placeholder="Enter expression"
                      value={field.expression ?? ''}
                      onChange={e => setField(index, {expression: e.target.value})}
                    />
                  </div>
                }
              </div>
              {!field.isCustom &&
                <a className='float-end' href="#/"
                  onClick={() => setField(index, {isCustom: true})}
                >
                  <small>Custom</small>
                </a>
              }
              {field.isCustom &&
                <a className='float-end' href="#/"
                  onClick={() => setField(index, {isCustom: false})}
                >
                  <small>Normal</small>
                </a>
              } 
            </td>

            <td className="text-center">
              <input type="checkbox" className="form-check-input"
                checked={field.groupBy ?? false}
                onChange={e => setField(index, {groupBy: e.target.checked})}
              />
            </td>

            <td>
              {!field.groupBy &&
                <select className="form-control"
                  value={field.aggMethod}
                  onChange={e => setField(index, {aggMethod: e.target.value})}
                >
                  <option value=""></option>
                  <option value="COUNT">Count</option>
                  <option value="SUM">Sum</option>
                  <option value="MIN">Min</option>
                  <option value="MAX">Max</option>
                  <option value="GROUP_CONCAT">Group Concat</option>
                </select>
              }
            </td>
            
            <td>
              <input className="form-control"
                value={field.alias ?? ''}
                onChange={e => setField(index, {alias: e.target.value})}
              />
            </td>
            <td>
              <select className="form-control"
                  value={field.orderBy}
                  onChange={e => setField(index, {orderBy: e.target.value})}
                >
                  <option value=""></option>
                  <option value="ASC">Asc</option>
                  <option value="DESC">Desc</option>
                </select>

            </td>
            <td>
              <input className="form-control"
                type="number" min="1"
                value={field.orderPriority ?? ''}
                onChange={e => setField(index, {orderPriority: e.target.value})}
              />
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
    <button className="btn btn-sm btn-primary" onClick={() => addField(selectedFields.length)}>
      <i className="fas fa-plus"></i>
    </button>
  </div>);
}
