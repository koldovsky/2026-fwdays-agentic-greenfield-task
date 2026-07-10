import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HouseError } from './house-errors';
import { HousesService } from './houses.service';

const OWNER = BigInt(1);

describe('HousesService', () => {
  const prismaMock = {
    house: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    ticket: {
      count: jest.fn(),
    },
  };
  let service: HousesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new HousesService(prismaMock as unknown as PrismaService);
  });

  describe('list', () => {
    it('queries only the owner rows, newest first (FR-HOUSE-01, FR-ACCESS-01)', async () => {
      prismaMock.house.findMany.mockResolvedValue([]);
      await service.list(OWNER);
      expect(prismaMock.house.findMany).toHaveBeenCalledWith({
        where: { userId: OWNER },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('trims name and note and stores them for the owner', async () => {
      prismaMock.house.create.mockResolvedValue({});
      await service.create(OWNER, {
        name: '  Шевченка 12  ',
        note: '  примітка  ',
      });
      expect(prismaMock.house.create).toHaveBeenCalledWith({
        data: { userId: OWNER, name: 'Шевченка 12', note: 'примітка' },
      });
    });

    it('stores null note when note is absent or blank', async () => {
      prismaMock.house.create.mockResolvedValue({});
      await service.create(OWNER, { name: 'Дім', note: '   ' });
      expect(prismaMock.house.create).toHaveBeenCalledWith({
        data: { userId: OWNER, name: 'Дім', note: null },
      });
    });

    it.each([undefined, '', '   ', 42])(
      'rejects invalid name %p with HOUSE_NAME_INVALID and creates nothing',
      async (name) => {
        await expect(service.create(OWNER, { name })).rejects.toMatchObject({
          response: { code: 'HOUSE_NAME_INVALID' },
        });
        expect(prismaMock.house.create).not.toHaveBeenCalled();
      },
    );

    it('rejects a name longer than 255 characters', async () => {
      await expect(
        service.create(OWNER, { name: 'a'.repeat(256) }),
      ).rejects.toMatchObject({ response: { code: 'HOUSE_NAME_INVALID' } });
    });

    it('rejects a note longer than 1000 characters', async () => {
      await expect(
        service.create(OWNER, { name: 'Дім', note: 'a'.repeat(1001) }),
      ).rejects.toMatchObject({ response: { code: 'HOUSE_NOTE_INVALID' } });
    });
  });

  describe('get', () => {
    it('scopes the lookup to id AND owner in a single query (NFR-SEC-03)', async () => {
      const house = { id: BigInt(5) };
      prismaMock.house.findFirst.mockResolvedValue(house);
      await expect(service.get(OWNER, '5')).resolves.toBe(house);
      expect(prismaMock.house.findFirst).toHaveBeenCalledWith({
        where: { id: BigInt(5), userId: OWNER },
      });
    });

    it('answers the same 404 for missing and foreign houses (FR-ACCESS-01)', async () => {
      prismaMock.house.findFirst.mockResolvedValue(null); // foreign or missing
      const missing = await service.get(OWNER, '999').catch((e) => e);
      const foreign = await service.get(OWNER, '5').catch((e) => e);
      for (const err of [missing, foreign]) {
        expect(err).toBeInstanceOf(HouseError);
        expect(err.getStatus()).toBe(404);
      }
      expect(missing.getResponse()).toEqual(foreign.getResponse());
    });

    it('treats a non-numeric id as the same 404 without querying', async () => {
      await expect(service.get(OWNER, 'abc')).rejects.toMatchObject({
        response: { code: 'HOUSE_NOT_FOUND' },
      });
      expect(prismaMock.house.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('updates atomically with the owner filter and returns the fresh row', async () => {
      prismaMock.house.updateMany.mockResolvedValue({ count: 1 });
      const updated = { id: BigInt(5), name: 'Дім', note: 'нова' };
      prismaMock.house.findFirst.mockResolvedValue(updated);

      await expect(
        service.update(OWNER, '5', { note: ' нова ' }),
      ).resolves.toBe(updated);
      expect(prismaMock.house.updateMany).toHaveBeenCalledWith({
        where: { id: BigInt(5), userId: OWNER },
        data: { note: 'нова' },
      });
    });

    it('leaves fields absent from the payload untouched', async () => {
      prismaMock.house.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.house.findFirst.mockResolvedValue({});
      await service.update(OWNER, '5', { name: 'Нова назва' });
      expect(prismaMock.house.updateMany).toHaveBeenCalledWith({
        where: { id: BigInt(5), userId: OWNER },
        data: { name: 'Нова назва' },
      });
    });

    it('rejects emptying the name and changes nothing', async () => {
      await expect(
        service.update(OWNER, '5', { name: '  ' }),
      ).rejects.toMatchObject({ response: { code: 'HOUSE_NAME_INVALID' } });
      expect(prismaMock.house.updateMany).not.toHaveBeenCalled();
    });

    it('answers 404 when the row is foreign or missing (count 0)', async () => {
      prismaMock.house.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.update(OWNER, '5', { name: 'Дім' }),
      ).rejects.toMatchObject({ response: { code: 'HOUSE_NOT_FOUND' } });
    });

    it('treats a patch with no known fields as a no-op read (S-04 smoke finding)', async () => {
      const house = { id: BigInt(5) };
      prismaMock.house.findFirst.mockResolvedValue(house);
      await expect(service.update(OWNER, '5', {})).resolves.toBe(house);
      // no empty updateMany: it would report count 0 and 404 the owner
      expect(prismaMock.house.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a house without tickets within the owner scope (FR-HOUSE-02 happy path)', async () => {
      prismaMock.ticket.count.mockResolvedValue(0);
      prismaMock.house.deleteMany.mockResolvedValue({ count: 1 });
      await service.remove(OWNER, '5');
      expect(prismaMock.ticket.count).toHaveBeenCalledWith({
        where: { houseId: BigInt(5), house: { userId: OWNER } },
      });
      expect(prismaMock.house.deleteMany).toHaveBeenCalledWith({
        where: { id: BigInt(5), userId: OWNER },
      });
    });

    it('refuses to delete a house with tickets (FR-HOUSE-02)', async () => {
      prismaMock.ticket.count.mockResolvedValue(1);
      const err = await service.remove(OWNER, '5').catch((e) => e);
      expect(err).toBeInstanceOf(HouseError);
      expect(err.getStatus()).toBe(409);
      expect(err.getResponse()).toMatchObject({ code: 'HOUSE_HAS_TICKETS' });
      expect(prismaMock.house.deleteMany).not.toHaveBeenCalled();
    });

    it('maps the FK Restrict backstop (P2003) to the same refusal', async () => {
      prismaMock.ticket.count.mockResolvedValue(0); // race: ticket created after the count
      prismaMock.house.deleteMany.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK constraint', {
          code: 'P2003',
          clientVersion: 'test',
        }),
      );
      await expect(service.remove(OWNER, '5')).rejects.toMatchObject({
        response: { code: 'HOUSE_HAS_TICKETS' },
      });
    });

    it('answers 404 when the row is foreign or missing', async () => {
      prismaMock.ticket.count.mockResolvedValue(0);
      prismaMock.house.deleteMany.mockResolvedValue({ count: 0 });
      await expect(service.remove(OWNER, '5')).rejects.toMatchObject({
        response: { code: 'HOUSE_NOT_FOUND' },
      });
    });
  });
});
