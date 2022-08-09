import { useSliceSelector, useSliceStore, deepCopy } from 'utils/reduxHelper';
import { BASE_URL, PAGE_WIDTH, TABLE_WIDTH, TABLE_ROW_HEIGHT } from "utils/constants";

function isOverlapped(rect1, rect2){
  let padding = 20;
  let xOverlapped = (
    (rect1.left >= rect2.left - padding && rect1.left <= rect2.right + padding) ||
    (rect2.left >= rect1.left - padding && rect2.left <= rect1.right + padding)
  );
  let yOverlapped = (
    (rect1.top >= rect2.top - padding && rect1.top <= rect2.bottom + padding) ||
    (rect2.top >= rect1.top - padding && rect2.top <= rect1.bottom + padding)
  );
  return xOverlapped && yOverlapped;
}

export default function TableList(){
  const store = useSliceStore('app');
  let [tableList, selectedTables, activeTab] = useSliceSelector('app', ['tableList', 'selectedTables', 'activeTab']);
  tableList = tableList ?? [];
  selectedTables = selectedTables ?? [];
  activeTab = activeTab ?? 'diagram';

  async function getTableFields(connection, table){
    let data = new FormData();
    data.append("db_host", connection.dbHost);
    data.append("db_user", connection.dbUser);
    data.append("db_pass", connection.dbPass);
    data.append("db_name", connection.dbName);
    data.append("table_name", table.name);
    let resp = await fetch(BASE_URL + '/get-table-columns', {method: "POST", body: data});
    let result = await resp.json();
    table.fields = result ?? [];

    resp = await fetch(BASE_URL + '/get-fk-list', {method: "POST", body: data});
    result = await resp.json();

    table.foreignKeys = (result ?? []).map(x => ({
        fieldName: x.column_name,
        foreignTableName: x.referenced_table_name,
        foreignFieldName: x.referenced_column_name
      })
    )
  }
  

  async function toggleTable(tableName){
    let {tableList, connection} = store.getState();
    tableList = tableList ?? [];

    tableList = deepCopy(tableList);

    for(let i = 0; i < tableList.length; i++){
      let table = tableList[i];
      if(table.name === tableName) {
        table.selected = !table.selected;
      }

      if(table.selected && !table.fields) {
        await getTableFields(connection, table);
      }
    }
    
    store.setState({
      tableList: tableList
    });
  }

  async function selectTable(tableName) {
    let {selectedTables, tableList, joinList, connection} = store.getState();
    
    tableList = deepCopy(tableList ?? []);
    selectedTables = deepCopy(selectedTables ?? []);
    joinList = deepCopy(joinList ?? []);

    let table = tableList.find(x => x.name === tableName);

    if(!table.fields){
      await getTableFields(connection, table);
    }

    let [x,y] = [100,100];
    let bound = document.getElementById('rightPanel').getBoundingClientRect();

    while(true){
      let rect = {
        top: bound.top + y,
        left: bound.left + x,
        bottom: bound.top + y + table.fields.length * TABLE_ROW_HEIGHT,
        right: bound.left + x + TABLE_WIDTH
      };

      let overlapped = selectedTables.some(table =>
        isOverlapped(
          rect, 
          document.getElementById(`table_${table.name}`).getBoundingClientRect()
        )
      );

      if(!overlapped) break;
      x += 50;
      if(x + TABLE_WIDTH > PAGE_WIDTH) {
        x = 100;
        y += 50;
      }
    }

    table.position = {x, y};
    
    table.foreignKeys.forEach(fk => {
      if(fk.foreignTableName === tableName) {
        return;
      }

      if(!selectedTables.find(x => x.name === fk.foreignTableName)){
        return;
      }

      joinList.push({
        from: {
          tableName: table.name,
          fieldName: fk.fieldName
        },
        to: {
          tableName: fk.foreignTableName,
          fieldName: fk.foreignFieldName
        }
      })
    });

    selectedTables.forEach(table2 => {
      table2.foreignKeys.forEach(fk => {
        if(fk.foreignTableName === tableName) {
          joinList.push({
            from:{
              tableName: table2.name,
              fieldName: fk.fieldName
            },
            to: {
              tableName: tableName,
              fieldName: fk.foreignFieldName
            }
          })
        }
      });
    });

    selectedTables.push(table);
    
    store.setState({
      tableList,
      joinList,
      selectedTables
    });
  }
  
  return (
    tableList.length > 0 ?
      <div className="m-2">
        <b>Table List</b>
        <ul className="list-unstyled">
          {tableList.map((table, index) => 
            <li key={index} className="ms-3">
              <a className="text-decoration-none" href="#/"
                onClick={() => toggleTable(table.name)}
              >
                <b>{table.selected? "▽": "▷"}</b>
              </a>
              {" "} {table.name}
              {activeTab === 'diagram' && selectedTables.every(x => x.name !== table.name) &&
                <a href="#/"
                  className="float-end text-decoration-none"
                  onClick={() => selectTable(table.name)}
                >
                  <b>→</b>
                </a>
              }
              {table.selected &&
                <ul>
                  {table.fields.map(field =>
                    <li key={field.name}>
                      <b>{field.name}:</b> {" "} {field.type}
                    </li>
                  )}
                </ul>
              }
            </li>
          )}
        </ul>
      </div>
    : <></>
  )
}