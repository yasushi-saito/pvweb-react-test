# pvweb-react-test

A minimal example of Paraview React components.

```
set -ex
DIR=`pwd`
cd $DIR/ts
yarn install
yarn run build
pvpython \
    --force-offscreen-rendering \
    -dr $DIR/server/server.py \
    --content $DIR/ts/dist \
    --port 8080 \
```

Then connect to `localhost:8080`. It should show a cone.
