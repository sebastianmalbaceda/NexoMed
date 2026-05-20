import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // NOTA: Todas las credenciales, nombres, fechas de nacimiento y diagnósticos
  // utilizados en este seed son datos sintéticos generados para desarrollo y pruebas.
  // No corresponden a personas reales.
  const seedPassword = process.env.SEED_PASSWORD ?? 'password123';
  const passwordHash = await bcrypt.hash(seedPassword, 12);

  // --- USUARIOS ---
  console.log('Creating users...');

  const doctor = await prisma.user.upsert({
    where: { email: 'dr.garcia@nexomed.es' },
    update: { name: 'Dr. Antonio García' },
    create: { email: 'dr.garcia@nexomed.es', passwordHash, role: 'DOCTOR', name: 'Dr. Antonio García' },
  });

  // Enfermeros — Distribución de 5 enfermeros
  const nurseMorning1 = await prisma.user.upsert({
    where: { email: 'enf.martinez@nexomed.es' },
    update: { name: 'María Martínez', shift: 'morning' },
    create: { email: 'enf.martinez@nexomed.es', passwordHash, role: 'NURSE', name: 'María Martínez', shift: 'morning' },
  });

  const nurseMorning2 = await prisma.user.upsert({
    where: { email: 'enf.gomez@nexomed.es' },
    update: { name: 'Pedro Gómez', shift: 'morning' },
    create: { email: 'enf.gomez@nexomed.es', passwordHash, role: 'NURSE', name: 'Pedro Gómez', shift: 'morning' },
  });

  const nurseAfternoon1 = await prisma.user.upsert({
    where: { email: 'enf.lopez@nexomed.es' },
    update: { name: 'Carlos López', shift: 'afternoon' },
    create: { email: 'enf.lopez@nexomed.es', passwordHash, role: 'NURSE', name: 'Carlos López', shift: 'afternoon' },
  });

  const nurseAfternoon2 = await prisma.user.upsert({
    where: { email: 'enf.vera@nexomed.es' },
    update: { name: 'Sofía Vera', shift: 'afternoon' },
    create: { email: 'enf.vera@nexomed.es', passwordHash, role: 'NURSE', name: 'Sofía Vera', shift: 'afternoon' },
  });

  const nurseNight1 = await prisma.user.upsert({
    where: { email: 'enf.ruiz@nexomed.es' },
    update: { name: 'Ana Ruiz', shift: 'night' },
    create: { email: 'enf.ruiz@nexomed.es', passwordHash, role: 'NURSE', name: 'Ana Ruiz', shift: 'night' },
  });

  // Eliminar enfermeros sobrantes o renombrados (primero dependencias, luego usuarios)
  const emailsToRemove = ['enf.ramos@nexomed.es', 'enf.noche@nexomed.es', 'enf.extra@nexomed.es'];
  await prisma.notification.deleteMany({ where: { user: { email: { in: emailsToRemove } } } }).catch(() => {});
  await prisma.medSchedule.deleteMany({ where: { administeredBy: { email: { in: emailsToRemove } } } }).catch(() => {});
  await prisma.careRecord.deleteMany({ where: { recordedBy: { email: { in: emailsToRemove } } } }).catch(() => {});
  await prisma.incident.deleteMany({ where: { reportedBy: { email: { in: emailsToRemove } } } }).catch(() => {});
  await prisma.diagnosticTest.deleteMany({ where: { requestedBy: { email: { in: emailsToRemove } } } }).catch(() => {});
  await prisma.medication.deleteMany({ where: { prescribedBy: { email: { in: emailsToRemove } } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: { in: emailsToRemove } } }).catch(() => {});

  await prisma.user.upsert({
    where: { email: 'tcae.sanchez@nexomed.es' },
    update: { name: 'Laura Sánchez', shift: 'afternoon' },
    create: { email: 'tcae.sanchez@nexomed.es', passwordHash, role: 'TCAE', name: 'Laura Sánchez', shift: 'afternoon' },
  });

  await prisma.user.upsert({
    where: { email: 'tcae.exposito@nexomed.es' },
    update: { name: 'Jorge Expósito', shift: 'night' },
    create: { email: 'tcae.exposito@nexomed.es', passwordHash, role: 'TCAE', name: 'Jorge Expósito', shift: 'night' },
  });

  console.log('✅ Usuarios listos (8): 1 doctor, 5 enfermeros, 2 TCAE.');

  // --- CAMAS ---
  console.log('Creating beds...');

  const bedConfigs = [
    { room: 101, letter: 'A' }, { room: 101, letter: 'B' },
    { room: 102, letter: 'A' }, { room: 102, letter: 'B' },
    { room: 103, letter: 'A' }, { room: 103, letter: 'B' },
    { room: 104, letter: 'A' }, { room: 104, letter: 'B' },
    { room: 105, letter: 'A' }, { room: 105, letter: 'B' },
    { room: 106, letter: 'A' }, { room: 106, letter: 'B' },
    { room: 107, letter: 'A' }, { room: 107, letter: 'B' },
    { room: 108, letter: 'A' }, { room: 108, letter: 'B' },
    { room: 109, letter: 'A' }, { room: 109, letter: 'B' },
    { room: 110, letter: 'A' }, { room: 110, letter: 'B' },
    { room: 111, letter: 'A' }, { room: 111, letter: 'B' },
    { room: 112, letter: 'A' }, { room: 112, letter: 'B' },
  ];

  const beds = [];
  for (const config of bedConfigs) {
    const bed = await prisma.bed.upsert({
      where: { room_letter: { room: config.room, letter: config.letter } },
      update: {},
      create: { room: config.room, letter: config.letter, floor: 1 },
    });
    beds.push(bed);
  }

  console.log(`✅ Camas listas (${beds.length}).`);

  // --- PACIENTES con enfermera asignada ---
  console.log('Creating patients...');

  // Liberar camas con pacientes antiguos no deseados
  await prisma.patient.updateMany({
    where: {
      bedId: { in: beds.map(b => b.id) },
      NOT: {
        name: {
          in: [
            'Juan Pérez Ruiz', 'Ana Martínez Gil', 'Pedro Sánchez Torres',
            'Carmen Delgado Vela', 'Luis Ramírez Ortega', 'Isabel Fuentes Moreno',
          ]
        }
      }
    },
    data: { bedId: null }
  });

  const patientData = [
    {
      name: 'Juan Pérez Ruiz',
      dob: new Date('1958-03-15'),
      diagnosis: 'Neumonía adquirida en comunidad',
      allergies: ['Penicilina', 'Sulfamidas'],
      bedIndex: 0,
      nurseId: nurseMorning1.id,
    },
    {
      name: 'Ana Martínez Gil',
      dob: new Date('1972-07-22'),
      diagnosis: 'Fractura de cadera izquierda',
      allergies: [],
      bedIndex: 1,
      nurseId: nurseMorning1.id,
    },
    {
      name: 'Pedro Sánchez Torres',
      dob: new Date('1965-11-08'),
      diagnosis: 'IAM crítico - Stent coronario',
      allergies: ['Latex'],
      bedIndex: 2,
      nurseId: nurseAfternoon1.id,
    },
    {
      name: 'Carmen Delgado Vela',
      dob: new Date('1980-01-30'),
      diagnosis: 'Apendicitis aguda - Postoperatorio',
      allergies: ['Codeína'],
      bedIndex: 3,
      nurseId: nurseAfternoon1.id,
    },
    {
      name: 'Luis Ramírez Ortega',
      dob: new Date('1955-09-14'),
      diagnosis: 'EPOC reagudizado',
      allergies: ['Amoxicilina', 'Ibuprofeno'],
      bedIndex: 4,
      nurseId: nurseMorning2.id,
    },
    {
      name: 'Isabel Fuentes Moreno',
      dob: new Date('1990-04-03'),
      diagnosis: 'Cetoacidosis diabética - Alta',
      allergies: ['Metformin'],
      bedIndex: 5,
      nurseId: nurseNight1.id,
    },
  ];

  const patients = [];
  for (const pData of patientData) {
    const existing = await prisma.patient.findFirst({ where: { name: pData.name } });

    if (existing) {
      await prisma.patient.update({
        where: { id: existing.id },
        data: {
          bedId: beds[pData.bedIndex].id,
          diagnosis: pData.diagnosis,
          allergies: pData.allergies,
          assignedNurseId: pData.nurseId,
        }
      });
      patients.push({ ...existing, bedId: beds[pData.bedIndex].id, assignedNurseId: pData.nurseId });
    } else {
      const patient = await prisma.patient.create({
        data: {
          name: pData.name,
          dob: pData.dob,
          diagnosis: pData.diagnosis,
          allergies: pData.allergies,
          bedId: beds[pData.bedIndex].id,
          assignedNurseId: pData.nurseId,
        },
      });
      patients.push(patient);
    }
  }

  console.log(`✅ Pacientes listos (${patients.length}) con enfermera asignada.`);

  // --- MEDICACIONES ---
  console.log('Creating medications...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingMed1 = await prisma.medication.findFirst({
    where: { drugName: 'Amoxicilina 500mg', patientId: patients[0].id }
  });

  if (!existingMed1) {
    const med1 = await prisma.medication.create({
      data: {
        patientId: patients[0].id,
        drugName: 'Amoxicilina 500mg',
        dose: '500mg',
        route: 'oral',
        frequencyHrs: 8,
        startTime: new Date(today.getTime() + 8 * 60 * 60 * 1000),
        active: true,
        prescribedById: doctor.id,
      },
    });

    await prisma.medSchedule.createMany({
      data: [
        { medicationId: med1.id, scheduledAt: new Date(today.getTime() + 8 * 60 * 60 * 1000) },
        { medicationId: med1.id, scheduledAt: new Date(today.getTime() + 16 * 60 * 60 * 1000) },
      ],
    });
  }

  const existingMed2 = await prisma.medication.findFirst({
    where: { drugName: 'Paracetamol 1g', patientId: patients[0].id }
  });

  if (!existingMed2) {
    const med2 = await prisma.medication.create({
      data: {
        patientId: patients[0].id,
        drugName: 'Paracetamol 1g',
        dose: '1g',
        route: 'IV',
        frequencyHrs: 6,
        startTime: new Date(today.getTime() + 6 * 60 * 60 * 1000),
        active: true,
        prescribedById: doctor.id,
      },
    });

    await prisma.medSchedule.createMany({
      data: [
        { medicationId: med2.id, scheduledAt: new Date(today.getTime() + 6 * 60 * 60 * 1000) },
        { medicationId: med2.id, scheduledAt: new Date(today.getTime() + 12 * 60 * 60 * 1000) },
        { medicationId: med2.id, scheduledAt: new Date(today.getTime() + 18 * 60 * 60 * 1000) },
        { medicationId: med2.id, scheduledAt: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
      ],
    });
  }

  const existingMed3 = await prisma.medication.findFirst({
    where: { drugName: 'Enoxaparina 40mg', patientId: patients[2].id }
  });

  if (!existingMed3) {
    await prisma.medication.create({
      data: {
        patientId: patients[2].id,
        drugName: 'Enoxaparina 40mg',
        dose: '40mg',
        route: 'SC',
        frequencyHrs: 24,
        startTime: new Date(today.getTime() + 24 * 60 * 60 * 1000),
        active: true,
        prescribedById: doctor.id,
      },
    });
  }

  console.log('✅ Medicaciones listas.');

  // --- REGISTROS DE CUIDADOS ---
  const existingCare = await prisma.careRecord.count();
  if (existingCare === 0) {
    await prisma.careRecord.create({
      data: {
        patientId: patients[0].id,
        type: 'constante',
        value: '120/80',
        unit: 'mmHg',
        notes: 'PA estable',
        recordedById: nurseMorning1.id,
      },
    });

    await prisma.careRecord.create({
      data: {
        patientId: patients[1].id,
        type: 'constante',
        value: '97',
        unit: 'SpO2%',
        notes: 'Oximetría correcta con gafas nasales a 2L',
        recordedById: nurseAfternoon1.id,
      },
    });
    console.log('✅ Registros de cuidados creados (2).');
  }

  // --- NOTIFICACIONES ---
  const existingNotifs = await prisma.notification.count();
  if (existingNotifs === 0) {
    await prisma.notification.create({
      data: {
        userId: nurseMorning1.id,
        type: 'MED_NEW',
        message: 'Dr. García ha prescrito Enoxaparina 40mg para Pedro Sánchez Torres',
        relatedPatientId: patients[2].id,
      },
    });
    console.log('✅ Notificaciones creadas (1).');
  }

  console.log('');
  console.log('🎉 Seed completado con éxito!');
  console.log('');
  console.log(`📝 Credenciales (contraseña: ${seedPassword} para todos)`);
  console.log('');
  console.log('  👨‍⚕️  DOCTOR');
  console.log('      Dr. Antonio García     →  dr.garcia@nexomed.es');
  console.log('');
  console.log('  👩‍⚕️  ENFERMEROS — MAÑANA (07:00-15:00)');
  console.log('      María Martínez         →  enf.martinez@nexomed.es');
  console.log('      Pedro Gómez            →  enf.gomez@nexomed.es');
  console.log('');
  console.log('  👩‍⚕️  ENFERMEROS — TARDE (15:00-23:00)');
  console.log('      Carlos López           →  enf.lopez@nexomed.es');
  console.log('      Sofía Vera             →  enf.vera@nexomed.es');
  console.log('');
  console.log('  👩‍⚕️  ENFERMEROS — NOCHE (23:00-07:00)');
  console.log('      Ana Ruiz               →  enf.ruiz@nexomed.es');
  console.log('');
  console.log('  🏥  TCAE');
  console.log('      Laura Sánchez          →  tcae.sanchez@nexomed.es (tarde)');
  console.log('      Jorge Expósito         →  tcae.exposito@nexomed.es (noche)');
  console.log('');
  console.log(`  📊  ${patients.length} pacientes en ${beds.length} camas`);
  console.log('      Juan Pérez Ruiz        →  María Martínez (mañana)');
  console.log('      Ana Martínez Gil       →  María Martínez (mañana)');
  console.log('      Pedro Sánchez Torres   →  Carlos López (tarde)');
  console.log('      Carmen Delgado Vela    →  Carlos López (tarde)');
  console.log('      Luis Ramírez Ortega    →  Pedro Gómez (mañana)');
  console.log('      Isabel Fuentes Moreno  →  Ana Ruiz (noche)');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
