# Example

`app.js`
For a larger app, we'd have a section similar to this somewhere in our route handlers.

The express route handlers we set up here allow services to register their intent, port and ip via the `/services/:serviceIntent/:port` route.

When a service registers themselves with this route, they get put into a Service Registry.

`serviceRegistry.js`
The ServiceRegistry class keeps track of all of the current available services and their intents. To serve a particular intent, we need to `get()` a handler by `string: intent`. 

If `null` is returned, then there are no live handlers to serve the request.