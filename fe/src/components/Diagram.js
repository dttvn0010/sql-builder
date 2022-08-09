import Draggable from 'react-draggable';
import JoinModal from 'modals/JoinModal';

import { deepCopy, useSliceSelector, useSliceStore } from 'utils/reduxHelper';
import { drawLines } from 'draw';
import { useEffect } from 'react';

export default function Diagram(){
  const store = useSliceStore('app');
  let [connection, selectedTables, joinList] = useSliceSelector('app', 
      ['connection', 'selectedTables', 'joinList']);

  useEffect(function(){
    drawLines(joinList ?? []);
  }, [joinList]);

  selectedTables = selectedTables ?? [];
  joinList = joinList ?? [];

  selectedTables = deepCopy(selectedTables);

  selectedTables.forEach(table => {
    let joinedFieldNames = joinList.flatMap(join => [join.from, join.to])
                            .filter(x => x.tableName === table.name)
                            .map(x => x.fieldName);

    table.fields.forEach(field => {
      field.joined = joinedFieldNames.includes(field.name)
    });
  });

  function openJoinModal(tableName, fieldName){
    store.setState({
      showJoinModal: true,
      currentJoin: {
        from: {
          tableName,
          fieldName
        },
        to: {
          tableName: '',
          fieldName: ''
        }
      }
    });
  }

  function handleStart(e){

  }
  
  function handleDrag(e){
    var canvas = document.getElementById("canvas");
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  
  function handleStop(e){
    drawLines(joinList);
  }

  function filterCondition(conditionList, tableName) {
    conditionList = conditionList.filter(
      condition => condition.tableName !== tableName
    );
    conditionList.forEach(condition =>
      {
        if(condition.children){
          condition.children = filterCondition(condition.children, tableName);
        }
      }
    );
    return conditionList;
  }

  function removeTable(tableName){
    if(!window.confirm('Do you want to remove this table?')){
      return;
    }

    let {selectedTables, selectedFields, joinList, conditionList} = store.getState();
    selectedTables = selectedTables.filter(x => x.name !== tableName);
    selectedFields = (selectedFields ?? []).filter(x => x.tableName !== tableName);
    
    joinList = (joinList ?? []).filter(join =>
      join.from.tableName !== tableName &&
      join.to.tableName !== tableName 
    );

    conditionList = deepCopy(conditionList);
    conditionList = filterCondition(conditionList, tableName);

    store.setState({
      selectedTables,
      selectedFields,
      conditionList,
      joinList
    });
  }

  function removeJoin(tableName, fieldName){
    if(!window.confirm('Do you want to remove this join?')) {
      return;
    }

    let {joinList} = store.getState();
    joinList = joinList ?? [];

    joinList = joinList.filter(join => (
        !(join.from.tableName === tableName && join.from.fieldName === fieldName) &&
        !(join.to.tableName === tableName && join.to.fieldName === fieldName)
      )
    );

    store.setState({joinList: deepCopy(joinList)});
  }

  if(!connection){
    return <div className="p-3">Please connect to a database first.</div>;
  }

  return (
  <>
    <canvas id="canvas" width="2000" height="2000"/>

    <div id="rightPanel" style={{borderTop: "1px solid blue"}}>
      {selectedTables.map(table =>
        <Draggable
          onStart={handleStart}
          onDrag={handleDrag}
          onStop={handleStop}
          defaultPosition={{x: table.position.x, y: table.position.y}}
          position={null}
          grid={[5, 5]}
          scale={1}
        >
          <table id={`table_${table.name}`} className="entity-table">
            <thead>
              <tr key={table.name}>
                <th colSpan="4">
                  {table.name}
                  <div className="float-end">
                    <a href="#/" onClick={() => removeTable(table.name)}>
                      <i className="delete fas fa-trash"></i>
                    </a>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {table.fields.map(field =>
                <tr key={field.name} id={`${table.name}.${field.name}`}>
                  <td style={{width: "10%"}}>
                    {!field.joined &&
                      <a href="#/"
                        onClick={() => openJoinModal(table.name, field.name)}
                      >
                        <i className="edit fas fa-plug fa-rotate-270"></i>
                      </a>
                    }
                    {field.joined &&
                      <a href="#/"
                        onClick={() => removeJoin(table.name, field.name)}
                      >
                        <i className="delete fas fa-link"></i>
                      </a>
                    }
                  </td>
                  <td style={{width: "40%"}}>
                    {field.name} {" "}
                    {field.key === 'PRI' &&
                      <i className="primary-key fas fa-key"></i>
                    }
                  </td>
                  <td style={{width: "40%"}}>{field.type}</td>
                  <td style={{width: "10%"}}>
                    {!field.joined &&
                      <a href="#/"
                        onClick={() => openJoinModal(table.name, field.name)}
                      >
                        <i className="edit fas fa-plug fa-rotate-90"></i>
                      </a>
                    }
                    {field.joined &&
                      <a href="#/"
                        onClick={() => removeJoin(table.name, field.name)}
                      >
                        <i className="delete fas fa-link"></i>
                      </a>
                    }
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Draggable>
      )}
      <JoinModal/>
    </div>
  </>);
}