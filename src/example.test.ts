import { EntitySchema, MikroORM } from '@mikro-orm/sqlite';

class PersonName {
  constructor(readonly givenName: string, readonly surname: string) {}
}

export const PersonNameSchema = new EntitySchema<PersonName>({
  class: PersonName,
  embeddable: true,
  properties: {
    givenName: { type: 'string' },
    surname: { type: 'string' },
  },
});

class EmergencyContact {
  constructor(readonly name: PersonName, readonly relationship: string) {}
}

export const EmergencyContactSchema = new EntitySchema<EmergencyContact>({
  class: EmergencyContact,
  embeddable: true,
  properties: {
    name: {
      kind: 'embedded',
      entity: () => PersonName,
      prefix: 'emergency_contact_', // have to override the parent prefix
    },
    relationship: { type: 'string' },
  },
});

class Patient {
  constructor(
    readonly id: string, 
    readonly name: PersonName, 
    readonly emergencyContact: EmergencyContact
  ) {}
}

export const PatientSchema = new EntitySchema<Patient>({
  class: Patient,
  properties: {
    id: {
      type: 'text',
      primary: true,
    },
    name: {
      kind: 'embedded',
      entity: () => PersonName,
      prefix: false,
    },
    emergencyContact: {
      kind: 'embedded',
      entity: () => EmergencyContact,
      prefix: 'emergency_contact_',
      nullable: true,
    },
  },
});


let orm: MikroORM;

beforeAll(async () => {
  orm = await MikroORM.init({
    dbName: ':memory:',
    entities: [PatientSchema, PersonNameSchema, EmergencyContactSchema],
    debug: ['query', 'query-params'],
    allowGlobalContext: true, // only for testing
  });
  await orm.schema.refreshDatabase();
});

afterAll(async () => {
  await orm.close(true);
});

test('basic CRUD example', async () => {
  orm.em.create(Patient, { id: '1', name: {
    givenName: 'John',
    surname: 'Doe',
  }, emergencyContact: {
    name: {
      givenName: 'Jane',
      surname: 'Doe',
    },
    relationship: 'wife',
  } });
  await orm.em.flush();
  orm.em.clear();

  const qb = orm.em.createQueryBuilder('Patient');

  qb.select(['*']).where({ id: '1' });
  const patient = await qb.execute('get', true);
  expect(patient).toStrictEqual({
    id: '1',
    name: {
      givenName: 'John',
      surname: 'Doe'
    },
    emergencyContact: {
      name: {
        givenName: 'Jane',
        surname: 'Doe'
      },
      relationship: 'wife'
    }
  });
});
