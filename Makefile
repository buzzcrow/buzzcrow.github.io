build:
	bundle exec jekyll build

run:
	bundle exec jekyll serve

test:
	JEKYLL_ENV=production bundle exec jekyll build
