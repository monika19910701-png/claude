const serviceInfo = {
  service: 'claude',
  mode: 'cloudflare-worker',
  description: 'Cloudflare Worker entrypoint for the Claude Co-Work project',
  endpoints: {
    '/': 'service metadata and available endpoints',
    '/health': 'basic health status'
  }
};

export function handleRequest(request) {
  const url = new URL(request.url);

  if (url.pathname === '/health') {
    return Response.json({ ok: true, service: serviceInfo.service });
  }

  return Response.json(serviceInfo);
}

export default {
  fetch(request) {
    return handleRequest(request);
  }
};
