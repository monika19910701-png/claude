'use strict';

const { clamp, normalizeText, unique } = require('./utils');

function collectProfileKeywords(profile) {
  return unique(
    [profile.title, ...(profile.specialties || [])]
      .flatMap((entry) => normalizeText(entry).split(/[^a-z0-9+#]+/))
      .filter(Boolean)
  );
}

function extractJobText(job) {
  return normalizeText(
    [
      job.title,
      job.description,
      ...(job.skills || []),
      job.client && job.client.country
    ].join(' ')
  );
}

function findMatchedSkills(profile, job) {
  const jobText = extractJobText(job);
  return unique(
    (profile.specialties || []).filter((skill) => {
      const normalizedSkill = normalizeText(skill);
      return normalizedSkill && jobText.includes(normalizedSkill);
    })
  );
}

function detectRisks(job) {
  const description = normalizeText(job.description);
  const risks = [];

  if (job.client && job.client.paymentVerified === false) {
    risks.push('Cliente sin método de pago verificado');
  }
  if (!job.budget && !(job.minBudget || job.maxBudget)) {
    risks.push('Presupuesto no especificado');
  }
  if (/whatsapp|telegram|gmail|outside freelancer|outside the platform|contact me/i.test(job.description || '')) {
    risks.push('Posible intento de sacar la comunicación fuera de Freelancer');
  }
  if (/bank|ssn|passport|id card|license/i.test(description)) {
    risks.push('Solicitud potencial de información sensible');
  }
  if ((job.proposalCount || 0) > 25) {
    risks.push('Alta competencia por número de propuestas');
  }

  return risks;
}

function detectAdvantages(profile, job, matchedSkills) {
  const advantages = [];

  if (matchedSkills.length) {
    advantages.push(`Coincidencia directa con ${matchedSkills.slice(0, 4).join(', ')}`);
  }
  if (job.client && job.client.paymentVerified) {
    advantages.push('Cliente con método de pago verificado');
  }
  if (job.budget || job.minBudget || job.maxBudget) {
    advantages.push('Presupuesto definido');
  }
  if ((job.proposalCount || 0) <= 10) {
    advantages.push('Competencia moderada o baja');
  }

  return advantages;
}

function computeCompatibility(profile, job, matchedSkills, risks) {
  const profileKeywords = collectProfileKeywords(profile);
  const jobText = extractJobText(job);
  const keywordMatches = profileKeywords.filter((keyword) => jobText.includes(keyword)).length;

  let score = 35;
  score += matchedSkills.length * 10;
  score += Math.min(keywordMatches, 8) * 3;

  if (job.client && job.client.paymentVerified) score += 8;
  if (job.budget || job.minBudget || job.maxBudget) score += 7;
  if ((job.proposalCount || 0) <= 10) score += 5;

  score -= risks.length * 8;

  return clamp(Math.round(score), 0, 100);
}

function recommendBid(job) {
  if (job.budget) return `${job.currency || 'USD'} ${job.budget}`;
  if (job.minBudget && job.maxBudget) {
    const recommended = Math.round((job.minBudget + job.maxBudget) / 2);
    return `${job.currency || 'USD'} ${recommended}`;
  }
  if (job.minBudget) return `${job.currency || 'USD'} ${job.minBudget}`;
  return 'Solicitar aclaración de presupuesto antes de ofertar';
}

function recommendTimeline(job) {
  if (job.timelineDays) return `${job.timelineDays} días`;
  if ((job.skills || []).some((skill) => normalizeText(skill).includes('data entry'))) return '2-3 días';
  return '3-5 días';
}

function localizeTimeline(timeline, language) {
  if (language === 'en') {
    return timeline
      .replace(/\bdías\b/g, 'days')
      .replace(/\bdía\b/g, 'day');
  }
  return timeline;
}

function recommendationFromScore(score, risks) {
  if (risks.some((risk) => /fuera de freelancer|informacion sensible/i.test(risk))) {
    return 'Rechazar';
  }
  if (score >= 75) return 'Aprobar';
  if (score >= 55) return 'Modificar';
  return 'Rechazar';
}

function analyzeJob(profile, job) {
  const matchedSkills = findMatchedSkills(profile, job);
  const risks = detectRisks(job);
  const advantages = detectAdvantages(profile, job, matchedSkills);
  const compatibility = computeCompatibility(profile, job, matchedSkills, risks);
  const recommendedBid = recommendBid(job);
  const recommendedTimeline = recommendTimeline(job);
  const recommendation = recommendationFromScore(compatibility, risks);

  return {
    title: job.title,
    id: job.id || 'No especificado',
    url: job.url || 'No especificado',
    budget: job.budget
      ? `${job.currency || 'USD'} ${job.budget}`
      : job.minBudget || job.maxBudget
        ? `${job.currency || 'USD'} ${job.minBudget || '?'} - ${job.maxBudget || '?'}`
        : 'No especificado',
    requiredSkills: job.skills || [],
    clientReputation: job.client
      ? {
          paymentVerified: Boolean(job.client.paymentVerified),
          rating: job.client.rating || 'Sin rating',
          reviews: job.client.reviews || 0,
          country: job.client.country || 'No especificado'
        }
      : 'No especificado',
    proposalCount: job.proposalCount || 0,
    advantages: advantages.length ? advantages : ['Ninguna ventaja clara identificada'],
    risks: risks.length ? risks : ['Ninguno identificado'],
    matchedSkills,
    compatibility,
    recommendedBid,
    recommendedTimeline,
    recommendation
  };
}

function detectLanguage(job) {
  if (job.language) return normalizeText(job.language).startsWith('es') ? 'es' : 'en';
  const combined = normalizeText(`${job.title} ${job.description}`);
  return /\b(necesito|busco|proyecto|datos|excel|investigacion)\b/.test(combined) ? 'es' : 'en';
}

function buildProposal(profile, job) {
  const analysis = analyzeJob(profile, job);
  const language = detectLanguage(job);
  const topSkills = analysis.matchedSkills.slice(0, 3);
  const fallbackSkills = (profile.specialties || []).slice(0, 3);
  const skillsToMention = topSkills.length ? topSkills : fallbackSkills;
  const timeline = localizeTimeline(analysis.recommendedTimeline, language);
  const bid = analysis.recommendedBid;

  if (language === 'es') {
    return {
      language,
      bid,
      timeline,
      milestones: [
        `Revisión inicial y validación del alcance (${timeline})`,
        'Entrega final y ajustes menores'
      ],
      text: [
        `Hola, revisé tu proyecto "${job.title}" y entiendo que necesitas apoyo confiable para completar este trabajo con precisión y buena comunicación.`,
        `Puedo ayudarte usando habilidades reales en ${skillsToMention.join(', ')} para organizar el proceso, validar los datos y entregar un resultado limpio y útil.`,
        `Mi propuesta inicial es completar el trabajo en ${timeline} con una oferta de ${bid}.`,
        'Si lo deseas, puedo comenzar revisando una muestra o el alcance exacto para confirmar el mejor enfoque.',
        '¿Qué formato final esperas recibir y cuál es la prioridad más importante para ti?',
        'Quedo atenta para conversar y ajustar la propuesta si hace falta.'
      ].join('\n\n')
    };
  }

  return {
    language,
    bid,
    timeline,
    milestones: [
      `Initial scope review and work plan (${timeline})`,
      'Final delivery plus minor revisions'
    ],
    text: [
      `Hello, I reviewed your project "${job.title}" and I understand you need reliable support to complete it accurately and efficiently.`,
      `I can help by using proven skills in ${skillsToMention.join(', ')} to organize the workflow, validate the data, and deliver a clean final result.`,
      `My initial proposal is ${bid} with an estimated timeline of ${timeline}.`,
      'If you would like, I can start by reviewing a sample or the exact scope so I can confirm the best approach before moving forward.',
      'Could you share the expected final format and the most important priority for this project?',
      'I would be glad to discuss the details and adjust the proposal if needed.'
    ].join('\n\n')
  };
}

function reviewProfile(profile) {
  const strengths = [];
  const improvements = [];

  if ((profile.specialties || []).length >= 8) {
    strengths.push('El perfil cubre suficientes habilidades para proyectos de data entry, research y soporte');
  }
  if (/data entry/i.test(profile.title || '')) {
    strengths.push('El título ya comunica una especialidad clara y demandada');
  }
  if (/ai|chatgpt/i.test(profile.title || '') || (profile.specialties || []).some((skill) => /ai|chatgpt/i.test(skill))) {
    strengths.push('Incluye habilidades actuales relacionadas con IA');
  }

  if ((profile.specialties || []).length > 10) {
    improvements.push('Conviene priorizar 6-8 habilidades principales en la presentación pública para mejorar foco');
  }
  improvements.push('Añadir portafolio con 3 ejemplos concretos de data entry, web research y limpieza de datos');
  improvements.push('Usar propuestas personalizadas y no genéricas para elevar la tasa de respuesta');

  return {
    suggestedTitle: profile.title,
    summary: `${profile.name} se enfoca en ${profile.specialties.slice(0, 5).join(', ')} con objetivo de conseguir proyectos legítimos y bien pagados.`,
    strengths,
    improvements
  };
}

function buildApprovalRequest(input) {
  return [
    'ACCIÓN PROPUESTA:',
    input.action,
    '',
    'PROYECTO O SECCIÓN:',
    input.section,
    '',
    'CONTENIDO FINAL:',
    input.content,
    '',
    'COSTO O COMPROMISO:',
    input.costOrCommitment,
    '',
    'RIESGOS:',
    input.risks && input.risks.length ? input.risks.join('; ') : 'Ninguno identificado',
    '',
    'RECOMENDACIÓN:',
    input.recommendation,
    '',
    'CONFIRMACIÓN NECESARIA:',
    input.confirmationPhrase
  ].join('\n');
}

module.exports = {
  analyzeJob,
  buildApprovalRequest,
  buildProposal,
  reviewProfile
};
