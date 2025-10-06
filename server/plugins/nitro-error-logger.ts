export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const m = event.node.req.method || 'GET'
    const u = event.node.req.url || event.path || ''
    console.log(`[REQ] ${m} ${u}`)
  })

  nitroApp.hooks.hook('afterResponse', (event, response) => {
    const m = event.node.req.method || 'GET'
    const u = event.node.req.url || event.path || ''
    const status = event.node.res.statusCode
    console.log(`[RES] ${m} ${u} -> ${status}`)
  })

  nitroApp.hooks.hook('error', (error, { event }) => {
    const m = event?.node?.req?.method || 'GET'
    const u = event?.node?.req?.url || event?.path || ''
    console.error(`[ERR] ${m} ${u} -> ${String(error?.message || error)}`)
    if (error?.stack) console.error(error.stack)
  })
})
