# Claude Co-Work Freelancer MVP

MVP local para preparar un flujo seguro de trabajo entre Claude Co-Work y Freelancer. Este proyecto **no ejecuta acciones reales en Freelancer**: analiza oportunidades, genera propuestas y construye solicitudes de aprobación antes de cualquier cambio o envío.

## Qué hace

- revisa un perfil base;
- analiza proyectos en JSON;
- calcula compatibilidad, ventajas y riesgos;
- genera propuestas profesionales en inglés o español;
- crea el resumen de aprobación con el formato definido por la usuaria.

## Requisitos

- Node.js 18+

## Uso

Instalar dependencias no es necesario porque el MVP usa solo módulos nativos.

### Revisar perfil

```bash
cd /home/runner/work/claude/claude
npm start -- review-profile
```

### Analizar un proyecto

```bash
cd /home/runner/work/claude/claude
npm start -- analyze-job /home/runner/work/claude/claude/data/sample-job.json
```

### Generar propuesta

```bash
cd /home/runner/work/claude/claude
npm start -- draft-proposal /home/runner/work/claude/claude/data/sample-job.json
```

### Preparar solicitud de aprobación

```bash
cd /home/runner/work/claude/claude
npm start -- prepare-approval /home/runner/work/claude/claude/data/sample-approval.json
```

## Estructura

- `/home/runner/work/claude/claude/src/cli.js`: interfaz CLI
- `/home/runner/work/claude/claude/src/workflow.js`: reglas de análisis y borradores
- `/home/runner/work/claude/claude/data/profile.json`: perfil profesional base
- `/home/runner/work/claude/claude/data/sample-job.json`: ejemplo de proyecto
- `/home/runner/work/claude/claude/data/sample-approval.json`: ejemplo de aprobación

## Próximo paso recomendado

Conectar este MVP a una capa real de automatización o MCP de Freelancer, manteniendo el flujo:

1. consultar;
2. analizar;
3. proponer;
4. esperar confirmación;
5. ejecutar;
6. verificar.
