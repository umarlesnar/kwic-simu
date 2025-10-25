echo $CR_PAT | docker login ghcr.io -u subbusura --password-stdin

echo $tag_name

arrIN=(${tag_name//kv/ })

docker build -t ghcr.io/subbusura/whatsapp-simulator:${arrIN[0]} .

docker push ghcr.io/subbusura/whatsapp-simulator:${arrIN[0]}