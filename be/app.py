import re
from flask import Flask, jsonify, request
from flask_cors import CORS
import MySQLdb

app = Flask(__name__)
CORS(app)

FIELD_TYPES = {
    0: 'DECIMAL',
    1: 'TINY',
    2: 'SHORT',
    3: 'LONG',
    4: 'FLOAT',
    5: 'DOUBLE',
    6: 'NULL',
    7: 'TIMESTAMP',
    8: 'LONGLONG',
    9: 'INT24',
    10: 'DATE',
    11: 'TIME',
    12: 'DATETIME',
    13: 'YEAR',
    14: 'NEWDATE',
    15: 'VARCHAR',
    16: 'BIT',
    246: 'NEWDECIMAL',
    247: 'INTERVAL',
    248: 'SET',
    249: 'TINY_BLOB',
    250: 'MEDIUM_BLOB',
    251: 'LONG_BLOB',
    252: 'BLOB',
    253: 'VAR_STRING',
    254: 'STRING',
    255: 'GEOMETRY' 
 }

@app.route('/get-table-list', methods=['POST'])
def get_table_list():
    db_host = request.form.get('db_host')
    db_user = request.form.get('db_user')
    db_pass = request.form.get('db_pass')
    db_name = request.form.get('db_name')
    try:
        db = MySQLdb.connect(db_host, db_user, db_pass, db_name, charset='utf8', connect_timeout=3)

        cursor = db.cursor()

        cursor.execute("show tables")
                                    
        results = cursor.fetchall()
        
        db.close()
        
        return jsonify([x[0] for x in results])
    except Exception as e:
        print(e)
        return jsonify({'error': 'Fail to connect'}), 500

@app.route('/get-table-columns', methods=['POST'])
def get_table_columns():
    db_host = request.form.get('db_host')
    db_user = request.form.get('db_user')
    db_pass = request.form.get('db_pass')
    db_name = request.form.get('db_name')
    table_name = request.form.get('table_name')
    db = MySQLdb.connect(db_host, db_user, db_pass, db_name, charset='utf8')

    cursor = db.cursor()
    cursor.execute("desc " + table_name)

    results = cursor.fetchall()

    db.close()

    return jsonify([
        {
            'name': x[0],
            'type': x[1],
            'nullable': x[2],
            'key': x[3],
            'default': x[4],
            'extra': x[5]
        } for x in results
    ])


@app.route('/get-fk-list', methods=['POST'])
def get_fk_list():
    db_host = request.form.get('db_host')
    db_user = request.form.get('db_user')
    db_pass = request.form.get('db_pass')
    db_name = request.form.get('db_name', '')
    table_name = request.form.get('table_name', '').replace("'", "''")
    referenced_table_name = request.form.get('referenced_table_name', '').replace("'", "''")
    
    sql = f'''
        SELECT 
            TABLE_NAME,REFERENCED_TABLE_NAME,CONSTRAINT_NAME,COLUMN_NAME,REFERENCED_COLUMN_NAME
        FROM
            INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE
            REFERENCED_TABLE_SCHEMA = '{db_name}'
    '''

    if referenced_table_name:
        sql += f" AND REFERENCED_TABLE_NAME = '{referenced_table_name}'"
    if table_name:
        sql += f" AND TABLE_NAME='{table_name}'"
    
    db = MySQLdb.connect(db_host, db_user, db_pass, db_name, charset='utf8')

    cursor = db.cursor()

    cursor.execute(sql)

    results = cursor.fetchall()

    db.close()

    return jsonify([
        {
            'constrain_name': x[2],
            'table_name': x[0],
            'column_name': x[3],
            'referenced_table_name': x[1],
            'referenced_column_name': x[4]
        } for x in results
    ])

def get_count_query(query):
    query_upper = query.upper()
    pos = query_upper.find('LIMIT')
    
    if pos < 0:
        pos = len(query)

    query= query[:pos]
    query = re.sub('(SELECT|Select|select)[ ]*\*','SELECT 1', query)
    query = re.sub('[A-Za-z]+[ ]*\.\*','1', query)

    return f'''
        WITH tmp__table AS (
            {query}
        )select COUNT(1) from tmp__table
    '''

@app.route('/execute-query', methods=['POST'])
def execute_query():
    db_host = request.form.get('db_host')
    db_user = request.form.get('db_user')
    db_pass = request.form.get('db_pass')
    db_name = request.form.get('db_name', '')
    query = request.form.get('query', '')
    page = int(request.form.get('page', 1))
    page_size = int(request.form.get('page_size', 10))

    if 'LIMIT' not in query.upper():
        query += f' LIMIT {(page-1)*page_size},{page_size}'

    try:
        db = MySQLdb.connect(db_host, db_user, db_pass, db_name, charset='utf8')

        cursor = db.cursor()
        
        cursor.execute(get_count_query(query))
        total = cursor.fetchall()[0][0]

        cursor.execute(query)

        num_fields = len(cursor.description)
        descriptions = list(cursor.description)

        fields = [
            {
                'name': i[0],
                'type': FIELD_TYPES[i[1]]
            }
            for i in descriptions
        ]

        results = []
        for row in cursor.fetchall():
            item = []
            for j,col in enumerate(row):
                type_ = descriptions[j][1]
                if type_ < 10:
                    item.append(col)
                elif type_ == 10:
                    item.append(col.strftime('%Y-%m-%d') if col else None)
                elif type_ == 14:
                    item.append(col.strftime('%Y-%m-%d %H:%M:%S') if col else None)
                else:
                    item.append(str(col))
            results.append(item)

        db.close()

        return jsonify({
            'total': total,
            'fields': fields,
            'rows': results
        })
    except Exception as e:
        print(e)
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0')
