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
cd claude
npm start -- review-profile
```

### Analizar un proyecto

```bash
cd claude
npm start -- analyze-job ./data/sample-job.json
```

### Generar propuesta

```bash
cd claude
npm start -- draft-proposal ./data/sample-job.json
```

### Preparar solicitud de aprobación

```bash
cd claude
npm start -- prepare-approval ./data/sample-approval.json
```

## Estructura

- `src/cli.js`: interfaz CLI
- `src/workflow.js`: reglas de análisis y borradores
- `data/profile.json`: perfil profesional base
- `data/sample-job.json`: ejemplo de proyecto
- `data/sample-approval.json`: ejemplo de aprobación

## Próximo paso recomendado

Conectar este MVP a una capa real de automatización o MCP de Freelancer, manteniendo el flujo:

1. consultar;
2. analizar;
3. proponer;
4. esperar confirmación;
5. ejecutar;
6. verificar.
