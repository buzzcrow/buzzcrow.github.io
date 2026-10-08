build:
	pixi run build

run:
	pixi run serve

serve: run

test:
	pixi run test

install:
	pixi run bundle-install
