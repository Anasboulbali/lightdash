import {
    Button,
    Dialog,
    DialogBody,
    DialogFooter,
    FormGroup,
    HTMLSelect,
    InputGroup,
} from '@blueprintjs/core';
import {
    DashboardChartTile,
    DashboardTileTypes,
    getDefaultChartTileSize,
} from '@lightdash/common';
import { FC, useCallback, useState } from 'react';
import { v4 as uuid4 } from 'uuid';

import {
    appendNewTilesToBottom,
    useCreateMutation,
    useDashboardQuery,
    useUpdateDashboard,
} from '../../hooks/dashboard/useDashboard';
import { useDashboards } from '../../hooks/dashboard/useDashboards';
import { useSavedQuery } from '../../hooks/useSavedQuery';
import {
    useCreateMutation as useSpaceCreateMutation,
    useSpaces,
} from '../../hooks/useSpaces';

interface AddTilesToDashboardModalProps {
    isOpen: boolean;
    projectUuid: string;
    savedChartUuid: string;
    onClose?: () => void;
}

const AddTilesToDashboardModal: FC<AddTilesToDashboardModalProps> = ({
    isOpen,
    projectUuid,
    savedChartUuid,
    onClose,
}) => {
    const [selectedDashboardUuid, setSelectedDashboardUuid] =
        useState<string>();
    const [selectedSpaceUuid, setSpaceUuid] = useState<string>();

    const [isCreatingNewDashboard, setIsCreatingNewDashboard] = useState(false);
    const [newDashboardName, setNewDashboardName] = useState('');
    const [newDashboardDescription, setNewDashboardDescription] =
        useState<string>('');

    const [isCreatingNewSpace, setIsCreatingNewSpace] =
        useState<boolean>(false);
    const [newSpaceName, setNewSpaceName] = useState('');

    const [isLoading, setIsLoading] = useState(false);

    const { data: savedChart } = useSavedQuery({ id: savedChartUuid });
    const { data: dashboards, isLoading: isLoadingDashboards } = useDashboards(
        projectUuid,
        {
            onSuccess: (data) => {
                if (data.length > 0) {
                    setSelectedDashboardUuid(data[0].uuid);
                } else {
                    setIsCreatingNewDashboard(true);
                }
            },
        },
    );
    const { data: spaces, isLoading: isLoadingSpaces } = useSpaces(
        projectUuid,
        {
            onSuccess: (data) => {
                if (data.length > 0) {
                    setSpaceUuid(data[0].uuid);
                } else {
                    setIsCreatingNewSpace(true);
                }
            },
        },
    );
    const { data: selectedDashboard } = useDashboardQuery(
        selectedDashboardUuid,
    );

    const { mutateAsync: createDashboard } = useCreateMutation(
        projectUuid,
        true,
    );
    const { mutateAsync: updateDashboard } = useUpdateDashboard(
        selectedDashboardUuid,
        true,
    );
    const { mutateAsync: createSpace } = useSpaceCreateMutation(projectUuid);

    const handleSubmit = useCallback(async () => {
        if (!savedChart) return;

        setIsLoading(true);

        try {
            let spaceUuid = selectedSpaceUuid;
            if (isCreatingNewSpace) {
                const newSpace = await createSpace({
                    name: newSpaceName,
                    isPrivate: false,
                    access: [],
                });

                spaceUuid = newSpace.uuid;
            }

            const newTile: DashboardChartTile = {
                uuid: uuid4(),
                type: DashboardTileTypes.SAVED_CHART,
                properties: {
                    savedChartUuid: savedChart.uuid,
                    title: savedChart.name,
                },
                ...getDefaultChartTileSize(savedChart.chartConfig?.type),
            };

            if (isCreatingNewDashboard) {
                createDashboard({
                    name: newDashboardName,
                    description: newDashboardDescription,
                    spaceUuid: spaceUuid,
                    tiles: [
                        {
                            uuid: uuid4(),
                            type: DashboardTileTypes.SAVED_CHART,

                            properties: {
                                savedChartUuid: savedChart.uuid,
                                title: savedChart.name,
                            },
                            ...getDefaultChartTileSize(
                                savedChart?.chartConfig.type,
                            ),
                        },
                    ],
                });
            } else {
                if (!selectedDashboard) throw new Error('Expected dashboard');

                updateDashboard({
                    name: selectedDashboard.name,
                    filters: selectedDashboard.filters,
                    tiles: appendNewTilesToBottom(selectedDashboard.tiles, [
                        newTile,
                    ]),
                });
            }

            onClose?.();
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [
        createDashboard,
        createSpace,
        updateDashboard,
        savedChart,
        selectedDashboard,
        selectedSpaceUuid,
        newDashboardName,
        newSpaceName,
        isCreatingNewDashboard,
        isCreatingNewSpace,
        onClose,
        newDashboardDescription,
    ]);

    if (isLoadingDashboards || !dashboards || isLoadingSpaces || !spaces) {
        return null;
    }

    const showNewDashboardInput =
        isCreatingNewDashboard || dashboards.length === 0;
    const showNewSpaceInput = isCreatingNewSpace || spaces.length === 0;

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            lazy
            icon="control"
            title="Add chart to dashboard"
        >
            <DialogBody>
                {!showNewDashboardInput ? (
                    <>
                        <FormGroup
                            label="Select a dashboard"
                            labelFor="select-dashboard"
                        >
                            <HTMLSelect
                                id="select-dashboard"
                                fill={true}
                                value={selectedDashboardUuid}
                                onChange={(e) =>
                                    setSelectedDashboardUuid(
                                        e.currentTarget.value,
                                    )
                                }
                                options={dashboards.map((d) => ({
                                    value: d.uuid,
                                    label: d.name,
                                }))}
                            />
                        </FormGroup>

                        <Button
                            minimal
                            icon="plus"
                            intent="primary"
                            onClick={() => setIsCreatingNewDashboard(true)}
                        >
                            Create new dashboard
                        </Button>
                    </>
                ) : (
                    <>
                        <FormGroup
                            label="Name your dashboard"
                            labelFor="chart-name"
                        >
                            <InputGroup
                                id="chart-name"
                                type="text"
                                value={newDashboardName}
                                onChange={(e) =>
                                    setNewDashboardName(e.target.value)
                                }
                                placeholder="eg. KPI dashboard"
                            />
                        </FormGroup>
                        <FormGroup
                            label="Dashboard description"
                            labelFor="chart-description"
                        >
                            <InputGroup
                                id="chart-description"
                                type="text"
                                value={newDashboardDescription}
                                onChange={(e) =>
                                    setNewDashboardDescription(e.target.value)
                                }
                                placeholder="A few words to give your team some context"
                            />
                        </FormGroup>

                        {!isLoadingSpaces && !showNewSpaceInput ? (
                            <>
                                <FormGroup
                                    label="Select a space"
                                    labelFor="select-dashboard"
                                >
                                    <HTMLSelect
                                        id="select-dashboard"
                                        fill={true}
                                        value={selectedSpaceUuid}
                                        onChange={(e) =>
                                            setSpaceUuid(e.currentTarget.value)
                                        }
                                        options={spaces.map((space) => ({
                                            value: space.uuid,
                                            label: space.name,
                                        }))}
                                    />
                                </FormGroup>

                                <Button
                                    minimal
                                    icon="plus"
                                    intent="primary"
                                    onClick={() => setIsCreatingNewSpace(true)}
                                >
                                    Create new space
                                </Button>
                            </>
                        ) : (
                            <>
                                <FormGroup
                                    label="Name new space"
                                    labelFor="chart-space"
                                >
                                    <InputGroup
                                        id="chart-space"
                                        type="text"
                                        value={newSpaceName}
                                        onChange={(e) =>
                                            setNewSpaceName(e.target.value)
                                        }
                                        placeholder="eg. KPIs"
                                    />
                                </FormGroup>
                                <Button
                                    minimal
                                    icon="arrow-left"
                                    intent="primary"
                                    onClick={() => setIsCreatingNewSpace(false)}
                                >
                                    Save to existing space
                                </Button>
                            </>
                        )}
                    </>
                )}
            </DialogBody>

            <DialogFooter
                actions={
                    <>
                        <Button
                            onClick={() => {
                                if (onClose) onClose();
                                setIsCreatingNewDashboard(false);
                            }}
                        >
                            Cancel
                        </Button>

                        <Button
                            intent="primary"
                            text="Add"
                            type="submit"
                            loading={isLoading}
                            onClick={handleSubmit}
                            disabled={
                                (isCreatingNewDashboard &&
                                    newDashboardName === '') ||
                                (isCreatingNewSpace && newSpaceName === '')
                            }
                        />
                    </>
                }
            />
        </Dialog>
    );
};

export default AddTilesToDashboardModal;
