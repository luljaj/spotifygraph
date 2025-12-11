# Sonova

An interactive visualization of your Spotify listening data as a graph. This is meant to represent looking through your music taste as constellations, with each artist being a star sized on listening, and edges being based on genres.

## Why

I love music, data visualization, and space. Thought this would be a great way to make these interests of mine meet. 

## Technical Challenges and Spec

Took some learning graph visualization. 

Basically, it grabs your top artists off of the Spotify (or last.fm) API, which gives you artist names along with one or two genres, then makes a graph by iterating through the API call and connecting each artist which shares a genre with another one. 

The rest is just CSS styling and some tweaking with node spacing. 

## Goals and Future Ideas

I want this to feel like going through space, but the space is your own music graph. In the future, maybe this will have the option to spot even deeper connections, with different degrees of separation between artists. Last.fm tends to give better info on artists, bc of the call "getSimilarArtists", which makes it a bit easier.
