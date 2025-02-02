import {
    ConditionalFormattingConfig,
    Field,
    fieldId,
    isField,
    PivotData,
    ResultValue,
    TableCalculation,
} from '@lightdash/common';
import { Table, TableProps } from '@mantine/core';
import last from 'lodash-es/last';
import React, { FC, useCallback } from 'react';

import HeaderCell from './HeaderCell';
import IndexCell from './IndexCell';
import { usePivotTableCellStyles, usePivotTableStyles } from './tableStyles';
import TitleCell from './TitleCell';
import ValueCell from './ValueCell';

type PivotTableProps = TableProps &
    React.RefAttributes<HTMLTableElement> & {
        data: PivotData;
        conditionalFormattings: ConditionalFormattingConfig[];
        hideRowNumbers: boolean;
        getFieldLabel: (fieldId: string) => string | undefined;
        getField: (fieldId: string) => Field | TableCalculation;
    };

const PivotTable: FC<PivotTableProps> = ({
    data,
    conditionalFormattings,
    hideRowNumbers = false,
    getFieldLabel,
    getField,
    className,
    ...tableProps
}) => {
    const { cx: tableCx, classes: tableStyles } = usePivotTableStyles();
    const { cx: cellCx, classes: cellStyles } = usePivotTableCellStyles({});

    const getItemFromAxis = useCallback(
        (rowIndex: number, colIndex: number) => {
            const value = data.pivotConfig.metricsAsRows
                ? last(data.headerValues)?.[colIndex]
                : last(data.indexValues[rowIndex]);

            if (!value || !value.fieldId) throw new Error('Invalid pivot data');

            return getField(value.fieldId);
        },
        [
            data.pivotConfig.metricsAsRows,
            data.headerValues,
            data.indexValues,
            getField,
        ],
    );

    const getUnderlyingFieldValues = useCallback(
        (rowIndex: number, colIndex: number) => {
            const item = getItemFromAxis(rowIndex, colIndex);
            const itemValue = data.dataValues[rowIndex][colIndex];

            const initialData =
                isField(item) && itemValue
                    ? { [fieldId(item)]: itemValue }
                    : {};

            return [
                // get the index values for this row
                ...(data.indexValues[rowIndex] ?? []),
                // get the header values for this column
                ...(data.headerValues.map((hv) => hv[colIndex]) ?? []),
            ]
                .filter((iv) => iv.type === 'value')
                .reduce<Record<string, ResultValue>>((acc, iv) => {
                    if (!iv.value) return acc;
                    return { ...acc, [iv.fieldId]: iv.value };
                }, initialData);
        },
        [data.indexValues, data.headerValues, data.dataValues, getItemFromAxis],
    );

    return (
        <Table
            cellSpacing={1}
            unstyled
            withBorder
            withColumnBorders
            className={tableCx(tableStyles.root, className)}
            w="xs"
            {...tableProps}
        >
            <thead>
                {data.headerValues.map((headerValues, headerRowIndex) => {
                    const headerLevel =
                        data.headerValues.length - headerRowIndex;

                    return (
                        <tr key={headerRowIndex}>
                            <>
                                {/* shows empty cell if row numbers are visible */}
                                {hideRowNumbers ? null : (
                                    <th
                                        className={cellCx(
                                            cellStyles.root,
                                            cellStyles.rowNumber,
                                        )}
                                    />
                                )}

                                {/* renders the title labels */}
                                {data.indexValueTypes.map(
                                    (_indexValueType, indexColIndex) => {
                                        const titleField =
                                            data.titleFields[headerRowIndex][
                                                indexColIndex
                                            ];

                                        const field = titleField?.fieldId
                                            ? getField(titleField?.fieldId)
                                            : undefined;

                                        const isEmpty = !titleField?.fieldId;

                                        const isHeaderTitle =
                                            titleField?.titleDirection ===
                                            'header';

                                        return (
                                            <TitleCell
                                                key={`${headerRowIndex}-${indexColIndex}`}
                                                className={cellCx(
                                                    cellStyles.root,
                                                    cellStyles.header,
                                                )}
                                                isEmpty={isEmpty}
                                                isHeaderTitle={isHeaderTitle}
                                                description={
                                                    isField(field)
                                                        ? field.description
                                                        : undefined
                                                }
                                                level={headerLevel}
                                            >
                                                {titleField?.fieldId
                                                    ? getFieldLabel(
                                                          titleField?.fieldId,
                                                      )
                                                    : undefined}
                                            </TitleCell>
                                        );
                                    },
                                )}

                                {/* renders the header values or labels */}
                                {headerValues.map(
                                    (headerValue, headerColIndex) => {
                                        const isLabel =
                                            headerValue.type === 'label';
                                        const field = getField(
                                            headerValue.fieldId,
                                        );

                                        const description =
                                            isLabel && isField(field)
                                                ? field.description
                                                : undefined;

                                        return (
                                            <HeaderCell
                                                key={`${headerRowIndex}-${headerColIndex}`}
                                                className={cellCx(
                                                    cellStyles.root,
                                                    cellStyles.header,
                                                )}
                                                level={headerLevel}
                                                description={description}
                                            >
                                                {isLabel
                                                    ? getFieldLabel(
                                                          headerValue.fieldId,
                                                      )
                                                    : headerValue.value
                                                          .formatted}
                                            </HeaderCell>
                                        );
                                    },
                                )}
                            </>
                        </tr>
                    );
                })}
            </thead>

            <tbody>
                {data.dataValues.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                        <>
                            {!hideRowNumbers && (
                                <td
                                    className={cellCx(
                                        cellStyles.root,
                                        cellStyles.rowNumber,
                                    )}
                                >
                                    {rowIndex + 1}
                                </td>
                            )}

                            {/* renders the index values or labels */}
                            {data.indexValueTypes.map(
                                (_indexValueType, indexColIndex) => {
                                    const indexValue =
                                        data.indexValues[rowIndex][
                                            indexColIndex
                                        ];
                                    const field = getField(indexValue.fieldId);
                                    const isLabel = indexValue.type === 'label';

                                    const description =
                                        isLabel && isField(field)
                                            ? field.description
                                            : undefined;

                                    return (
                                        <IndexCell
                                            key={`${rowIndex}-${indexColIndex}`}
                                            className={cellCx(
                                                cellStyles.root,
                                                cellStyles.header,
                                            )}
                                            description={description}
                                        >
                                            {isLabel
                                                ? getFieldLabel(
                                                      indexValue.fieldId,
                                                  )
                                                : indexValue.value.formatted}
                                        </IndexCell>
                                    );
                                },
                            )}

                            {/* renders the pivot values */}
                            {row.map((value, colIndex) => {
                                const item = getItemFromAxis(
                                    rowIndex,
                                    colIndex,
                                );

                                return (
                                    <ValueCell
                                        key={`${rowIndex}-${colIndex}`}
                                        item={item}
                                        value={value}
                                        colIndex={colIndex}
                                        rowIndex={rowIndex}
                                        getField={getField}
                                        getUnderlyingFieldValues={
                                            getUnderlyingFieldValues
                                        }
                                        conditionalFormattings={
                                            conditionalFormattings
                                        }
                                    />
                                );
                            })}
                        </>
                    </tr>
                ))}
            </tbody>
        </Table>
    );
};

export default PivotTable;
