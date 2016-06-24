/*
 * game.cpp
 *
 *  Created on: Nov 10, 2014
 *      Author: parallels
 */

#include <cmath>
#include <cstdlib>
#include "vector_graphics.h"
#include <Utilities.h>

// Virtual screen size
int screenWidth, screenHeight;

// Basic information on the terrain and the tanks
float *groundLevel;  // Y coordinate of the ground for each X coordinate
float tank1X, tank1Y, tank2X, tank2Y; // Positions of the two tanks
float tankRadius = 20;  // Radius of the tanks
float cannonLength = 40;   // How long the cannon on each tank extends
float gravity = 0.05;      // Strength of gravity

// Current state of the game
int playerHasWon = 0; // 1 if player 1 wins, 2 if player 2 wins, 0 if game in progress
bool player1Turn = true;  // true if it's player 1's turn; false otherwise
float tank1CannonAngle = M_PI/2;
float tank2CannonAngle = M_PI/2; // Direction the tank cannons are pointing
float tank1CannonStrength = 3;
float tank2CannonStrength = 3; // Strength of intended projectile launch

// Location of the projectile
bool projectileInMotion = false;
float projectilePositionX, projectilePositionY;
float projectileVelocityX, projectileVelocityY;

// Infor needed for sound rendering
bool collisionJustOccurred = false;
bool tankHitJustOccurred = false;

// Useful utility function for generating random floating-point values
float randomFloat(float low, float hi)
{
	float r = (float)random() / (float)RAND_MAX;
	return map(r, 0, 1, low, hi);
}

// Restart the game, without reallocating memory
void restartGame()
{
	float player1Height = screenHeight * 3/4; // randomFloat(screenHeight/2, screenHeight-5);
	float player2Height = screenHeight - 5; // randomFloat(screenHeight/2, screenHeight-5);
	for(int i = 0; i < screenWidth * 0.2; i++) {
		groundLevel[i] = player1Height;
	}
	for(int i = screenWidth * 0.2; i < screenWidth * 0.8; i++) {
		groundLevel[i] = player1Height + (player2Height - player1Height) * (i - screenWidth*0.2)/(screenWidth*0.6);
	}
	for(int i = screenWidth * 0.8; i < screenWidth; i++) {
		groundLevel[i] = player2Height;
	}

	// Set the location of the two tanks so they rest on the ground at opposite sides
	tank1X = screenWidth * 0.1;
	tank1Y = player1Height;
	tank2X = screenWidth * 0.9;
	tank2Y = player2Height;

	playerHasWon = 0;
	projectileInMotion = false;
}

// Initialise the game
void setupGame(int width, int height)
{
	// Set the screen size
	screenWidth = width;
	screenHeight = height;

	// Initialize the ground level
	groundLevel = new float[screenWidth];

	restartGame();
}

// Advance the turn to the next player
void nextPlayersTurn() {
	player1Turn = !player1Turn;
}


// Move forward one frame on the game physics
void nextGameFrame()
{
	if(!projectileInMotion)
		return;

	// Update position of projectile
	projectilePositionX += projectileVelocityX;
	projectilePositionY += projectileVelocityY;
	projectileVelocityY += gravity;

	// Check collision with tanks first: a collision with tank 1 means player 2 wins and vice-versa
	if((tank1X - projectilePositionX)*(tank1X - projectilePositionX) +
		(tank1Y - projectilePositionY)*(tank1Y - projectilePositionY)
		<= tankRadius * tankRadius)
	{
		projectileInMotion = false;
		collisionJustOccurred = false;
		tankHitJustOccurred = true;
		playerHasWon = 2;
	}
	else if((tank2X - projectilePositionX)*(tank2X - projectilePositionX) +
		(tank2Y - projectilePositionY)*(tank2Y - projectilePositionY)
		<= tankRadius * tankRadius)
	{
		projectileInMotion = false;
		collisionJustOccurred = false;
		tankHitJustOccurred = true;
		playerHasWon = 1;
	}
	else if(projectilePositionX < 0 || projectilePositionX >= screenWidth) {
		// Check collision whether projectile has exited the screen to the left or right
		projectileInMotion = false;
		collisionJustOccurred = true;
		nextPlayersTurn();
	}
	else if(projectilePositionY >= groundLevel[(int)floorf(projectilePositionX)]) {
		// Check for projectile collision with ground
		projectileInMotion = false;
		collisionJustOccurred = true;
		nextPlayersTurn();
	}
}

// Updates for game state
void setTank1CannonAngle(float angle)
{
	tank1CannonAngle = angle;
}

void setTank2CannonAngle(float angle)
{
	tank2CannonAngle = angle;
}

void setTank1CannonStrength(float strength)
{
	tank1CannonStrength = strength;
}

void setTank2CannonStrength(float strength)
{
	tank2CannonStrength = strength;
}

// FIRE!
void fireProjectile()
{
	// Can't fire while projectile is already moving, or if someone has won
	if(projectileInMotion)
		return;
	if(playerHasWon != 0)
		return;

    if(player1Turn) {
		projectilePositionX = tank1X + cannonLength * cosf(tank1CannonAngle);
		projectilePositionY = tank1Y - cannonLength * sinf(tank1CannonAngle);
		projectileVelocityX = tank1CannonStrength * cosf(tank1CannonAngle);
		projectileVelocityY = -tank1CannonStrength * sinf(tank1CannonAngle);
    }
    else {
		projectilePositionX = tank2X + cannonLength * cosf(tank2CannonAngle);
		projectilePositionY = tank2Y - cannonLength * sinf(tank2CannonAngle);
		projectileVelocityX = tank2CannonStrength * cosf(tank2CannonAngle);
		projectileVelocityY = -tank2CannonStrength * sinf(tank2CannonAngle);
    }

    // GO!
    projectileInMotion = true;
}

// Game state queries
bool gameStatusPlayer1Turn()
{
	return player1Turn;
}

bool gameStatusProjectileInMotion()
{
	return projectileInMotion;
}

int gameStatusWinner()
{
	return playerHasWon;
}

bool gameStatusCollisionOccurred()
{
	if(collisionJustOccurred) {
		collisionJustOccurred = false;
		return true;
	}
	return false;
}

bool gameStatusTankHitOccurred()
{
	if(tankHitJustOccurred) {
		tankHitJustOccurred = false;
		return true;
	}
	return false;
}


float gameStatusProjectileHeight()
{
	return projectilePositionY / (float)screenHeight;
}

// Clean up any allocated memory for the game
void cleanupGame()
{
	delete groundLevel;
}

// Drawing routines. Arguments are (interleaved) buffer to render
// into, the available size, and the target for how many samples
// to use (actual usage might vary slightly). Regardless of
// lengthTarget, never use more than bufferSize samples.

int drawGround(float *buffer, int bufferSize, int framesTarget)
{
	int length;

	// Calculate total length of ground line, to arrive at a speed calculation
	float totalLineLength = 0.4f*screenWidth
							+ sqrtf(0.36f*screenWidth*screenWidth
									+ (tank2Y-tank1Y)*(tank2Y-tank1Y));

	// Speed is calculated in pixels per frame
	float speed = totalLineLength / (float)framesTarget;

	// Draw three lines: platforms for tanks and the connecting line.
	// Eventually, render a more complex ground from the array.
	length = renderLine(0, tank1Y, screenWidth * 0.2, tank1Y,
						speed, buffer, bufferSize);
	length += renderLine(screenWidth * 0.2, tank1Y, screenWidth * 0.8, tank2Y,
						speed, &buffer[length], bufferSize - length);
	length += renderLine(screenWidth * 0.8, tank2Y, screenWidth, tank2Y,
						speed, &buffer[length], bufferSize - length);

	return length;
}

int drawTanks(float *buffer, int bufferSize, int framesTarget)
{
	int length = 0;

	// Calculate total length of tank lines, to arrive at a speed calculation
	float totalLineLength = 2.0*M_PI*tankRadius + 2.0*(cannonLength - tankRadius);

	// Speed is calculated in pixels per frame
	float speed = totalLineLength / (float)framesTarget;

	if(playerHasWon != 2) {
		// Tank 1 body = semicircle + line
		length += renderArc(tank1X, tank1Y, tankRadius, M_PI, 2.0 * M_PI,
							speed, buffer, bufferSize);
		length += renderLine(tank1X + tankRadius, tank1Y,
							 tank1X - tankRadius, tank1Y,
							speed, &buffer[length], bufferSize - length);
		// Tank 1 cannon (line depending on angle)
		length += renderLine(tank1X + tankRadius * cosf(tank1CannonAngle),
			 tank1Y - tankRadius * sinf(tank1CannonAngle),
			 tank1X + cannonLength * cosf(tank1CannonAngle),
			 tank1Y - cannonLength * sinf(tank1CannonAngle),
			 speed, &buffer[length], bufferSize - length);
	}

	if(playerHasWon != 1) {
		// Same idea for tank 2
		length += renderArc(tank2X, tank2Y, tankRadius, M_PI, 2.0 * M_PI,
							speed, &buffer[length], bufferSize - length);
		length += renderLine(tank2X + tankRadius, tank2Y,
							 tank2X - tankRadius, tank2Y,
							 speed, &buffer[length], bufferSize - length);
		length += renderLine(tank2X + tankRadius * cosf(tank2CannonAngle),
			 tank2Y - tankRadius * sinf(tank2CannonAngle),
			 tank2X + cannonLength * cosf(tank2CannonAngle),
			 tank2Y - cannonLength * sinf(tank2CannonAngle),
			 speed, &buffer[length], bufferSize - length);
	}

	return length;
}

int drawProjectile(float *buffer, int bufferSize, int framesTarget)
{
	if(!projectileInMotion)
		return 0;

	// Draw a point for a specified number of frames (each containing X and Y)
	// Return the number of items used in the buffer, which will be twice
	// the number of frames unless the buffer is full

	if(bufferSize/2 < framesTarget) {
		renderPoint(projectilePositionX, projectilePositionY, buffer, bufferSize/2);
		return bufferSize;
	}
	else {
		renderPoint(projectilePositionX, projectilePositionY, buffer, framesTarget);
		return framesTarget*2;
	}
}

// Main drawing routine entry point
int drawGame(float *buffer, int bufferSize)
{
	int length;

	// Based on buffer size, come up with speeds for each of the elements
	// 50% of time to ground; 30% to the tanks and 20% to the projectile
	// Give a margin of 25% beyond so we don't run out of buffer space
	// if things take longer to draw than we guess they will
	const float amountToUse = 0.375; // 0.75/2 because two samples per frame
	const float groundFraction = 0.5 * amountToUse;
	const float tankFraction = 0.3 * amountToUse;
	const float projectileFraction = 0.2 * amountToUse;

	length = drawGround(buffer, bufferSize, bufferSize * groundFraction);
	length += drawTanks(&buffer[length], bufferSize - length,
						bufferSize * tankFraction);
	length += drawProjectile(&buffer[length], bufferSize - length,
						bufferSize * projectileFraction);

	return length;
}
