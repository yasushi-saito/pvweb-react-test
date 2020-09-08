set -ex
DIR=$(dirname $0)
echo DIR $DIR
(
    cd $DIR/ts
    yarn install
    yarn run build)

pvpython \
    --force-offscreen-rendering \
    -dr $DIR/server/server.py \
    --content $DIR/ts/dist \
    --port 8080
