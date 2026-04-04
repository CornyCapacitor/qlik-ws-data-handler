type DataRow = Record<string, string | number>
export type DataTable = {
  name: string,
  columnCount: number,
  columns: string[],
  rowCount: number,
  time: number,
  rows: DataRow[],
  offset: number,
  chunkSize: number
}

export type QlikTable = {
  qName: string,
  qFields: { qName: string }[],
  qNoOfRows: number
}

export type QlikCell = {
  qText: string,
  qNum?: number
};

export type QlikRow = {
  qValue: QlikCell[]
};

export type QlikTableData = {
  qData: QlikRow[]
};