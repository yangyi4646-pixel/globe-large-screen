import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTaskStatus } from '../../src/bi-services/task';

function biSuccess<T>(response: T) {
    return { result: 'ok', response };
}

function jsonResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'content-type': 'application/json' },
    });
}

describe('task service', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('queries task status via /api/task/{taskId}', async () => {
        const taskId = 'ee997b20-281b-11f1-a5ba-d703edf1e35a';
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse(
                biSuccess({
                    taskId,
                    status: 'PROCESSING',
                    result: null,
                    startTime: '2026-03-25T15:26:25.000+08:00',
                    submitTime: '2026-03-25T15:26:25.000+08:00',
                    finishedTime: null,
                    endTime: null,
                    runningDuration: 1,
                    queueingDuration: 0,
                }),
            ),
        );

        vi.stubGlobal('fetch', fetchMock);

        const data = await getTaskStatus(taskId);

        expect(data).toEqual({
            taskId,
            status: 'PROCESSING',
            result: null,
            startTime: '2026-03-25T15:26:25.000+08:00',
            submitTime: '2026-03-25T15:26:25.000+08:00',
            finishedTime: null,
            endTime: null,
            runningDuration: 1,
            queueingDuration: 0,
        });
        expect(fetchMock).toHaveBeenCalledWith(
            `/api/task/${taskId}`,
            expect.objectContaining({ body: undefined, method: 'GET' }),
        );
    });
});
