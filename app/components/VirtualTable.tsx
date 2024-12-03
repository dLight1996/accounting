import React from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import VirtualList from 'rc-virtual-list';
import { EditableProTable, ProColumns } from '@ant-design/pro-components';
import type { ActionType } from '@ant-design/pro-components';

interface VirtualTableProps<T> extends Omit<TableProps<T>, 'columns'> {
  columns: ProColumns<T>[];
  value?: T[];
  onChange?: (value: T[]) => void;
  actionRef?: React.MutableRefObject<ActionType | undefined>;
  editable?: {
    type: 'single' | 'multiple';
    editableKeys: React.Key[];
    onChange: (editableKeys: React.Key[]) => void;
    onSave: (key: React.Key, row: T) => Promise<void>;
    actionRender?: (row: T, config: any, dom: React.ReactNode[]) => React.ReactNode[];
  };
  recordCreatorProps?: {
    record: () => T;
    creatorButtonText?: string;
    icon?: React.ReactNode;
  };
}

const VirtualTable = <T extends Record<string, any>>(props: VirtualTableProps<T>) => {
  const {
    columns,
    value,
    onChange,
    actionRef,
    editable,
    recordCreatorProps,
    pagination,
    ...restProps
  } = props;

  return (
    <EditableProTable<T>
      {...restProps}
      rowKey="id"
      scroll={{ x: 1100, y: 500 }}
      columns={columns}
      value={value}
      onChange={onChange}
      actionRef={actionRef}
      editable={editable}
      recordCreatorProps={recordCreatorProps}
      pagination={pagination}
      components={{
        body: {
          wrapper: ({ children }: { children: React.ReactNode }) => (
            <VirtualList
              height={500}
              itemHeight={54}
              itemCount={value?.length || 0}
              overscan={10}
            >
              {children}
            </VirtualList>
          ),
        },
      }}
      bordered
    />
  );
};

export default VirtualTable;
