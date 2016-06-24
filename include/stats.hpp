#ifndef STATS_HPP_INCLUDED
#define STATS_HPP_INCLUDED
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

template<class TYPE> 
class MovingAverage{
private:
  TYPE* array;
  int length;
  bool bufferFull;
  int pointer;
  TYPE sum;
  double scale;
  double average;
  void dealloc(){
	free(array);
    //  delete array;
  }
   
  void init(int aLength){
    length=aLength;
    scale=1.0/length;
    //  array= new TYPE(length); // for some reason this causes memory corruption, so I am using malloc() instead...
    array=(TYPE*)malloc(sizeof(TYPE)*length);
    sum=0;
    if(array==NULL)
      printf("Error while allocating array\n");
    memset(array, 0, sizeof(TYPE)*length);
    reset();
  }
public:
  MovingAverage(){
    init(0);
  }
  MovingAverage(int aLength){
    init(aLength);
  }
  ~MovingAverage(){
    dealloc();
  }
  int getLength(){
    return bufferFull ? length : pointer;
  }
  void setLength(int aLength){
    dealloc();
    init(aLength);
  }
  double add(TYPE newElement){
    sum-=array[pointer];
    array[pointer]=newElement;
    sum+=newElement;
    if(bufferFull==true){
    	average=sum*scale;
    }
    else{
    	average=sum/(double)(1+pointer);
    }
    pointer++;
    if(pointer==length){
      pointer=0;
      bufferFull=true;
    }
    return average;
  }
  double getAverage(){
    return average;
  }
  void reset(){
	  pointer=0;
	  bufferFull=false;
  }
};

#endif /* STATS_HPP_INCLUDED */
