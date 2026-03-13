const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Criar usuário admin
  const senhaHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@compativeis.com' },
    update: {},
    create: {
      nome: 'Admin',
      email: 'admin@compativeis.com',
      senhaHash,
      perfil: 'admin',
    },
  });
  console.log('Admin criado:', admin.email);

  // Criar usuários vendedores
  const vendedoresData = [
    {
      nome: 'Lucas',
      email: 'lucas@compativeis.com',
      perfil: 'vendedor',
      vendedor: {
        nomeExibicao: 'Lucas',
        papel: 'closer_lider',
        classesAtendidas: ['A'],
        leadsMax: 30,
      },
    },
    {
      nome: 'Juliana',
      email: 'juliana@compativeis.com',
      perfil: 'vendedor',
      vendedor: {
        nomeExibicao: 'Juliana',
        papel: 'closer_lider',
        classesAtendidas: ['A'],
        leadsMax: 30,
      },
    },
    {
      nome: 'Taiana',
      email: 'taiana@compativeis.com',
      perfil: 'vendedor',
      vendedor: {
        nomeExibicao: 'Taiana',
        papel: 'closer_independente',
        classesAtendidas: ['B'],
        leadsMax: 30,
      },
    },
    {
      nome: 'Carlos Trainee',
      email: 'carlos@compativeis.com',
      perfil: 'vendedor',
      vendedor: {
        nomeExibicao: 'Carlos',
        papel: 'trainee',
        classesAtendidas: ['B', 'C'],
        leadsMax: 20,
      },
    },
  ];

  for (const v of vendedoresData) {
    const usuario = await prisma.usuario.upsert({
      where: { email: v.email },
      update: {},
      create: {
        nome: v.nome,
        email: v.email,
        senhaHash: await bcrypt.hash('vendedor123', 10),
        perfil: v.perfil,
      },
    });

    await prisma.vendedor.upsert({
      where: { usuarioId: usuario.id },
      update: {},
      create: {
        usuarioId: usuario.id,
        nomeExibicao: v.vendedor.nomeExibicao,
        papel: v.vendedor.papel,
        classesAtendidas: v.vendedor.classesAtendidas,
        leadsMax: v.vendedor.leadsMax,
      },
    });

    console.log(`Vendedor criado: ${v.nome} (${v.vendedor.papel})`);
  }

  // Criar configurações de SLA
  const slaConfigs = [
    { classeLead: 'A', tempoMaximoMinutos: 5, alertaAmareloPct: 50, alertaVermelhoPct: 80, redistribuirAoEstourar: true },
    { classeLead: 'B', tempoMaximoMinutos: 120, alertaAmareloPct: 50, alertaVermelhoPct: 80, redistribuirAoEstourar: true },
    { classeLead: 'C', tempoMaximoMinutos: 10080, alertaAmareloPct: 50, alertaVermelhoPct: 80, redistribuirAoEstourar: false },
  ];

  for (const sla of slaConfigs) {
    await prisma.slaConfig.upsert({
      where: { classeLead: sla.classeLead },
      update: {},
      create: sla,
    });
    console.log(`SLA configurado: Classe ${sla.classeLead} — ${sla.tempoMaximoMinutos} min`);
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
