# Claude Co-Work Freelancer MVP

MVP local para preparar un flujo seguro de trabajo entre Claude Co-Work y Freelancer. El proyecto mantiene la lógica de análisis desacoplada de la integración externa y soporta dos modos:

- `local`: simulación segura con archivos JSON y persistencia local;
- `real`: adaptador HTTP separado para integrarse con un servicio externo compatible.

## Qué hace

- revisa un perfil base;
- analiza proyectos en JSON o desde una capa de integración;
- calcula compatibilidad, ventajas y riesgos;
- genera propuestas profesionales en inglés o español;
- guarda borradores, aprobaciones y ejecuciones;
- bloquea toda ejecución hasta recibir la frase exacta de confirmación;
- verifica después de ejecutar que el resultado coincida con lo aprobado.

## Requisitos

- Node.js 18+

## Uso

Instalar dependencias no es necesario porque el MVP usa solo módulos nativos.

### Comandos originales

#### Revisar perfil

```bash
cd /home/runner/work/claude/claude
npm start -- review-profile
```

#### Analizar un proyecto

```bash
cd /home/runner/work/claude/claude
npm start -- analyze-job /home/runner/work/claude/claude/data/sample-job.json
```

#### Generar propuesta

```bash
cd /home/runner/work/claude/claude
npm start -- draft-proposal /home/runner/work/claude/claude/data/sample-job.json
```

#### Preparar solicitud de aprobación desde JSON

```bash
cd /home/runner/work/claude/claude
npm start -- prepare-approval /home/runner/work/claude/claude/data/sample-approval.json
```

### Flujo completo con integración desacoplada

#### 1. Listar oportunidades

```bash
cd /home/runner/work/claude/claude
npm start -- list-jobs
```

#### 2. Ver detalle de un proyecto

```bash
cd /home/runner/work/claude/claude
npm start -- get-job FRE-1001
```

#### 3. Guardar un borrador con análisis y propuesta

```bash
cd /home/runner/work/claude/claude
npm start -- save-draft FRE-1001
```

#### 4. Solicitar aprobación del borrador guardado

```bash
cd /home/runner/work/claude/claude
npm start -- request-approval <draft-id>
```

#### 5. Aprobar explícitamente con la frase exacta

```bash
cd /home/runner/work/claude/claude
npm start -- approve-action <approval-id> "CONFIRMAR ENVÍO"
```

#### 6. Ejecutar la acción ya aprobada

```bash
cd /home/runner/work/claude/claude
npm start -- execute-action <approval-id>
```

#### 7. Verificar el resultado posterior

```bash
cd /home/runner/work/claude/claude
npm start -- verify-execution <execution-id>
```

## Modos de integración

### Modo local

Usa `/home/runner/work/claude/claude/data/local-jobs.json` y guarda estado en `/home/runner/work/claude/claude/.claude/state.json`.

Opciones útiles:

- `--jobs=/ruta/jobs.json`
- `--state=/ruta/state.json`
- `--profile=/ruta/profile.json`

### Modo real

Usa un adaptador HTTP separado de la lógica de negocio. Configura:

- `FREELANCER_API_BASE_URL`
- `FREELANCER_API_TOKEN`

Y ejecuta, por ejemplo:

```bash
cd /home/runner/work/claude/claude
FREELANCER_API_BASE_URL=https://example.invalid FREELANCER_API_TOKEN=token npm start -- list-jobs --mode=real
```

El adaptador real espera estos endpoints:

- `GET /jobs`
- `GET /jobs/:id`
- `POST /proposals`
- `GET /executions/:externalId`

## Persistencia

El estado local guarda:

- análisis por proyecto;
- borradores generados;
- aprobaciones pendientes, aprobadas o canceladas;
- ejecuciones y verificaciones posteriores.

## Estructura

- `/home/runner/work/claude/claude/src/cli.js`: interfaz CLI
- `/home/runner/work/claude/claude/src/workflow.js`: reglas de análisis y borradores
- `/home/runner/work/claude/claude/src/runtime.js`: orquestación del flujo completo
- `/home/runner/work/claude/claude/src/integrations/`: capa separada de integración local/real
- `/home/runner/work/claude/claude/src/state-store.js`: persistencia local de estado
- `/home/runner/work/claude/claude/src/validation.js`: validaciones de entrada y salida
- `/home/runner/work/claude/claude/data/profile.json`: perfil profesional base
- `/home/runner/work/claude/claude/data/local-jobs.json`: proyectos de ejemplo para el modo local

## Notas de seguridad

- el modo local no ejecuta acciones reales en Freelancer;
- toda ejecución queda bloqueada hasta aprobarla con la frase exacta esperada;
- la verificación posterior compara lo ejecutado con el contenido aprobado para evitar desvíos o envíos dobles.
