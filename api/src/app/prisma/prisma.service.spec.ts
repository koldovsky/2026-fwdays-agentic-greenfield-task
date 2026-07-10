import { poolConfigFromUrl } from './prisma.service';

describe('poolConfigFromUrl', () => {
  it('parses a standard mysql URL', () => {
    const config = poolConfigFromUrl(
      'mysql://servicedesk:secret@db.example.com:3307/servicedesk',
    );
    expect(config).toMatchObject({
      host: 'db.example.com',
      port: 3307,
      user: 'servicedesk',
      password: 'secret',
      database: 'servicedesk',
      allowPublicKeyRetrieval: true,
    });
  });

  it('defaults the port and decodes escaped credentials', () => {
    const config = poolConfigFromUrl('mysql://user:a%40b@localhost/app');
    expect(config).toMatchObject({
      host: 'localhost',
      port: 3306,
      password: 'a@b',
      database: 'app',
    });
  });
});
