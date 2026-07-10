import { TURBOSMS_SEND_URL, TurboSmsSender } from './turbosms-sender';

const config = { turbosmsToken: 'secret-token', turbosmsSender: 'Msg' };

function jsonResponse(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('TurboSmsSender', () => {
  it('POSTs the code to TurboSMS with bearer auth and +-less recipient', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        response_code: 800,
        response_status: 'SUCCESS_MESSAGE_ACCEPTED',
      }),
    );
    const sender = new TurboSmsSender(config, fetchMock);

    await sender.send('+380671234567', '123456');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(TURBOSMS_SEND_URL);
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer secret-token');
    const payload = JSON.parse(init.body);
    expect(payload.recipients).toEqual(['380671234567']);
    expect(payload.sms.sender).toBe('Msg');
    expect(payload.sms.text).toContain('123456');
  });

  it('logs the successful send outcome with a masked phone only', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        response_code: 800,
        response_status: 'SUCCESS_MESSAGE_ACCEPTED',
      }),
    );
    const sender = new TurboSmsSender(config, fetchMock);
    const log = jest.spyOn(
      (sender as unknown as { logger: { log: (m: string) => void } }).logger,
      'log',
    );

    await sender.send('+380671234567', '123456');

    expect(log).toHaveBeenCalledTimes(1);
    const line = log.mock.calls[0][0];
    expect(line).toContain('+380*****67');
    expect(line).not.toContain('380671234567');
    expect(line).not.toContain('123456');
  });

  it('throws on a non-success TurboSMS response', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        response_code: 103,
        response_status: 'REQUIRED_TOKEN',
      }),
    );
    const sender = new TurboSmsSender(config, fetchMock);
    await expect(sender.send('+380671234567', '123456')).rejects.toThrow(
      /TurboSMS/,
    );
  });

  it('throws on an HTTP error even without a JSON body', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response);
    const sender = new TurboSmsSender(config, fetchMock);
    await expect(sender.send('+380671234567', '123456')).rejects.toThrow(
      /TurboSMS/,
    );
  });
});
