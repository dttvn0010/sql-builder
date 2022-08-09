import { useSliceSelector, useSliceStore, deepCopy } from 'utils/reduxHelper';
import { BASE_URL } from "utils/constants";

function isValidCondition(condition) {
  const cond = condition.cond;
  const children = (condition.children ?? []).filter(isValidCondition);
  if(!cond) return false;

  if(cond === 'NOT'){
    if(children.length !== 1) {
      return false;
    }else{
      return isValidCondition(children[0]);
    }
  }

  if((cond === 'AND' || cond === 'OR')){
    if(children.length === 0){
      return false;
    }else{
      return children.every(isValidCondition);
    }
  }
  
  if(condition.fieldCustom) {
    return condition.expression;
  }else{
    return condition.tableName && condition.colName;
  }
}

function isNumberOrNull(value) {
  value = value ?? '';
  if(value.trim() === '') return false;
  return !isNaN(Number(value)) || value.toUpperCase() === 'NULL';
}

function splitArr(value) {
  let tmp = '';
  let inquote = false;
  value = value.replace('\\"', '%%');
  for(let i = 0; i < value.length; i++){
    let c = value[i];
    if(c === '"') {
      inquote = !inquote;
      continue;
    }
    if(!inquote || c !== ','){
      tmp += c;
    }else{
      tmp += '##';
    }
  }
  return tmp.split(',').map(el => el.replace('##', ',').replace('%%', '"'));
}

function genCondition(condition, indent) {
  if((condition.cond === 'AND' || condition.cond === 'OR') && condition.children) {
    let st = `(\n`;
    const children = condition.children.filter(isValidCondition);
    
    for(let i = 0; i < children.length; i++) {
      if(i === 0) st += indent + '    ';
      st += genCondition(children[i], indent + "    ")
      if(i+1 < children.length) st += `\n${indent}    ${condition.cond} `;
    }
    st += `\n${indent})`;
    return st;
  }

  if(condition.cond === 'NOT'){
    let st ='NOT';
    condition = condition.children[0];
    if(condition.cond !== 'AND' && condition.cond !== 'OR'){
      st += '(';
    }

    st += genCondition(condition, indent + "    ");

    if(condition.cond !== 'AND' && condition.cond !== 'OR'){
      st += `)`;
    }
    return st;
  }

  let value = condition.value ?? '';
  if(condition.cond === 'IN') {
    let valueArr = splitArr(value);
    if(!valueArr.every(isNumberOrNull)) {
      value = valueArr.map(x => `'${x}'`).join(', ');
    }
    value = `(${value})`;
  }else if(!isNumberOrNull(value)) { 
    if(condition.cond === 'CT') {
      value = `'%${value??""}%'`;
    } else if(condition.cond === 'SW') {
      value = `'${value??""}%'`;
    } else if(condition.cond === 'EW') {
      value = `'%${value??""}'`;
    }else{
      value = `'${value??""}'`;
    }
  }

  let ops = {
    EQ: '=',
    NE: '<>',
    LT: '<',
    LTE: '<=',
    GT: '>',
    GTE: '>=',
    IS: 'is',
    IN: 'in'
  }
  
  let fieldName = `${condition.tableName}.${condition.colName}`;
  if(condition.fieldCustom) {
    fieldName = condition.fieldExpression;
  }

  if(ops[condition.cond]){
    return `${fieldName} ${ops[condition.cond]} ${value}`
  }
  if(condition.cond === 'CT' || condition.cond === 'SW' || condition.cond === 'EW') {
    return `${fieldName} LIKE ${value}`
  }

  return '';
}

function genSQL(selectedTables, joinList, selectedFields, conditionList) {
  const groupByFields = selectedFields.filter(field => field.groupBy);
  const orderByFields = selectedFields.filter(field => !!field.orderBy);
  
  orderByFields.sort(function(f1, f2){
    if(!f1.orderPriority && !f2.orderPriority) return 0;
    if(!f1.orderPriority) return 1;
    if(!f2.orderPriority) return -1;
    return f1.orderPriority - f2.orderPriority;
  });

  selectedFields = selectedFields.filter(
    field => (field.isCustom && field.expression) || 
             (!field.isCustom && field.tableName && field.colName)
  );

  let sql = 'SELECT ';
  if(selectedFields.length === 0) {
    sql += '*';
  }else{
    for(let i = 0; i < selectedFields.length; i++) {
      let field = selectedFields[i];
      if(i > 0) sql += "    ";
      if(field.aggMethod) {
        sql +=  `${field.aggMethod}(`;
      }

      if(!field.isCustom) {
        sql += `${field.tableName}.${field.colName}`;
      }else{
        sql += field.expression;
      }
      
      if(field.aggMethod) {
        sql += ')'
      }

      if(field.alias) {
        sql += ` AS ${field.alias}`;
      }
      if(i+1 < selectedFields.length) sql += ",\n";
    }
  }
  
  sql += "\nFROM";

  selectedTables = deepCopy(selectedTables);
  let joinedTableNames = [];

  while(selectedTables.length > 0) {
    let i = 0;

    if(joinedTableNames.length > 0){
      sql += "\n    JOIN";
      for(i = 0; i < selectedTables.length; i++) {
        if(
            joinList.some(join => join.from.tableName === selectedTables[i].name && 
            joinedTableNames.includes(join.to.tableName))
        ){
          break;
        }
        if(
          joinList.some(join => join.to.tableName === selectedTables[i].name && 
          joinedTableNames.includes(join.from.tableName))
        ){
          break;
        }
      }
    }

    if(i === selectedTables.length) i = 0;

    let table = selectedTables.splice(i, 1)[0];
    sql += ` ${table.name} `;

    if(joinedTableNames.length > 0) {
      let currentJoinList = joinList.filter(
        join => (
          (join.from.tableName === table.name && joinedTableNames.includes(join.to.tableName)) ||
          (join.to.tableName === table.name && joinedTableNames.includes(join.from.tableName))
        )
      );
      
      if(currentJoinList.length > 0) {
        sql += "ON ";
        for(let j = 0; j < currentJoinList.length; j++) {
          let join = currentJoinList[j];
          sql += `${join.from.tableName}.${join.from.fieldName}=${join.to.tableName}.${join.to.fieldName}`;
          if(j+1 < currentJoinList.length) {
            sql += " AND ";
          }
        }
      }
    }

    joinedTableNames.push(table.name);
  }

  conditionList = conditionList.filter(isValidCondition);

  if(conditionList.length > 0) {
    let condition = {
      cond: 'AND',
      children: conditionList
    };
    sql += '\nWHERE ' + genCondition(condition, '');
  }

  if(groupByFields.length > 0) {
    sql += '\nGROUP BY ' + groupByFields.map(field => field.alias || `${field.tableName}.${field.colName}`).join(", ");
  }
  
  if(orderByFields.length > 0) {
    sql += '\nORDER BY ' + orderByFields.map(field => (field.alias || `${field.tableName}.${field.colName}`) + " " + (field.orderBy)).join(", ");
  }

  return sql;
}

async function executeQuery(store, page, pageSize){
  let {
    connection,
    selectedTables,
    joinList,
    selectedFields,
    conditionList,
    editing,
    tmpSql
  } = store.getState();

  let sql = tmpSql;
  if(!editing) {
    sql = genSQL(selectedTables ??[], joinList?? [], selectedFields ?? [], conditionList ?? []);
  }
  store.setState({loading: true, error: ''});

  let data = new FormData();
  data.append("db_host", connection.dbHost);
  data.append("db_user", connection.dbUser);
  data.append("db_pass", connection.dbPass);
  data.append("db_name", connection.dbName);
  data.append("query", sql);
  data.append("page",page ?? 1);
  data.append("page_size",pageSize ?? 10);
  let resp = await fetch(BASE_URL + '/execute-query', {method: "POST", body: data});
  let result = await resp.json();
  if(result.error) {
    store.setState({error: result.error, loading: false, dataSet: null});
  }else {
    store.setState({dataSet: result, page, pageSize, loading: false});
  }
}

function ResultTable(){
  const store = useSliceStore('app');
  let [dataSet, page, pageSize, loading] = useSliceSelector('app', 
      ['dataSet', 'page', 'pageSize', 'loading']
  );
  if(!dataSet) return <></>;

  page = page ?? 1;
  pageSize = pageSize ?? 10;
  const offset = (page-1) * pageSize;
  const maxPage = Math.ceil(dataSet.total / pageSize);

  function changePage(e) {
    const page = e.target.value;
    executeQuery(store, page, pageSize);
  }

  function changePageSize(e) {
    const pageSize = e.target.value;
    const maxPage = Math.ceil(dataSet.total / pageSize);
    if(page > maxPage) page = maxPage;
    executeQuery(store, page, pageSize);
  }

  return(
    <div className="pt-3 px-1 pb-5" style={{width: "100%", overflowX: "auto"}}>
      {!loading &&
        <>
          <div className="d-flex">
            <div>
              <small>Page size:</small>
              <select className='form-control' style={{maxWidth:"70px"}}
                value={pageSize}
                onChange={changePageSize}
              >
                <option>10</option>
                <option>20</option>
                <option>50</option>
              </select>
            </div>
            <div className="ms-3">
              <small>Page #:</small>
              <input type="number" min="1" max={maxPage}
                className='form-control' style={{maxWidth:"70px"}}
                value={page} onChange={changePage}
              />
            </div>
            <div className='ms-4'>
              <small>&nbsp;</small>
              <br/>
              <small>Total page: {maxPage} ({dataSet.total} records)</small>
            </div>
          </div>
          <table className="mt-3 table table-bordered">
            <thead>
              <tr>
                <th style={{width:"40px"}}>#</th>
                {dataSet.fields.map((field,index) => 
                  <th key={index}>{field.name}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {dataSet.rows.map((row, i) =>
                <tr key={i}>
                  <td>{i+1+offset}</td>
                  {row.map((col,j) => 
                    <td key={j}>{col}</td>
                  )}
                </tr>
              )}
            </tbody>
          </table>
        </>
      }
      
    </div>
  )
}

export default function Query(){
  const store = useSliceStore('app');

  let [
    connection,
    selectedTables, 
    joinList, 
    selectedFields, 
    conditionList, 
    tmpSql, 
    editing, 
    loading, 
    error
  ] = useSliceSelector('app', [
    'connection',
    'selectedTables', 
    'joinList', 
    'selectedFields', 
    'conditionList', 
    'tmpSql', 
    'editing', 
    'loading', 
    'error'
  ]);

  if(!connection){
    return <div className="p-3">Please connect to a database first.</div>;
  }

  const sql = genSQL(selectedTables ??[], joinList?? [], selectedFields ?? [], conditionList ?? []);
  
  return (
    <div className="p-3">
      <textarea readOnly={!editing} className="form-control" rows="10" value={editing ? tmpSql : sql}
        onChange={e => store.setState({tmpSql: e.target.value})}
      ></textarea>
      
      {!editing &&
        <a className="mt-2 float-end text-decoration-none" href="#/"
          onClick={() => store.setState({editing: true, tmpSql: sql})}
        >Custom Query</a>
      }
      {
        editing &&
        <a className="mt-2 float-end text-decoration-none" href="#/"
          onClick={() => store.setState({editing: false})}
        >Generated Query</a>
      }
      <div className="my-3" style={{color: "red"}}>{error}</div>
      <div>
        <button 
          className="mt-3 btn btn-sm btn-primary"
          onClick={() => executeQuery(store)}
        >
          Execute query
        </button>
      </div>
      {loading &&
        <div class="spinner-border mt-3" role="status">
          <span class="sr-only"></span>
        </div>
      }
      <ResultTable/>
    </div>
  );
}