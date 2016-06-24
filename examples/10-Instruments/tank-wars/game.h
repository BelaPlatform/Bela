/*
 * game.h
 *
 *  Created on: Nov 10, 2014
 *      Author: parallels
 */

#ifndef GAME_H_
#define GAME_H_

// Initialisation
void setupGame(int width, int height);
void restartGame();

// Update physics
void nextGameFrame();

// State updaters
void setTank1CannonAngle(float angle);
void setTank2CannonAngle(float angle);
void setTank1CannonStrength(float strength);
void setTank2CannonStrength(float strength);
void fireProjectile();

// State queries
bool gameStatusPlayer1Turn();
bool gameStatusProjectileInMotion();
int gameStatusWinner();
bool gameStatusCollisionOccurred();
bool gameStatusTankHitOccurred();
float gameStatusProjectileHeight();

// Render screen; returns length of buffer used
int drawGame(float *buffer, int bufferSize);

// Cleanup and memory release
void cleanupGame();

#endif /* GAME_H_ */
