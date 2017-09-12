var player;

var enemyList = {};
var upgradeList = {};
var bulletList = {};

Entity = function(type,id,x,y,spdX,spdY,width,height,img){
	var self = {
		type:type,
		x:x,
		spdX:spdX,
		y:y,
		spdY:spdY,
		width:width,
		height:height,
		img:img,
	}
	self.update = function(){
		self.updatePosition();
		self.draw();
	}
	
	self.updatePosition = function(){
		self.x += self.spdX;
		self.y += self.spdY;
		
		if(self.x < 0 || self.x > WIDTH){
			self.spdX = -self.spdX;
		}
		if(self.y < 0 || self.y > HEIGHT){
			self.spdY = -self.spdY;
			
		}
	}
	
	self.getDistanceBetweenEntity = function(entity2){
		var vx = self.x - entity2.x;
		var vy = self.y - entity2.y;
		return Math.sqrt(vx*vx*+vy*vy);
	}

	self.testCollisionEntity = function(entity2){
		var rect1 = {
			x:self.x-self.width/2,
			y:self.y-self.height/2,
			width:self.width,
			height:self.height,
		}
		var rect2 = {
			x:entity2.x-entity2.width/2,
			y:entity2.y-entity2.height/2,
			width:entity2.width,
			height:entity2.height,
		}
		return testCollisionRectRect(rect1, rect2);
	}
	
	self.draw = function(){
		ctx.save();
		var x = self.x-self.width/2;
		var y = self.y-self.height/2;
		ctx.drawImage(self.img,x,y);
		ctx.restore();
	}
	return self;
}

Actor = function(type, id, x, y, spdX, spdY,width, height, img, hp, attackSpeed){
	var self = Entity(type, id, x, y, spdX, spdY,width, height, img);
	self.hp = hp;
	self.attackSpeed = attackSpeed;
	self.attackCounter = 0;
	self.aimAngle = 0;
	self.performAttack = function(){
		if(self.attackCounter > 25){
			generateBullet(self);
			self.attackCounter = 0;
		}
	}
	self.performSpecialAttack = function(){
		if(self.attackCounter > 50){
			generateBullet(self, self.aimAngle-5);
			generateBullet(self, self.aimAngle);
			generateBullet(self, self.aimAngle+5);
			self.attackCounter = 0;
		}
	}
	var super_udpate = self.update;
	self.update = function(){
		super_udpate();
		self.attackCounter += self.attackSpeed;
	}
	return self;
}

Player = function(){
	var self = Actor('player', 'myId',50,40,30,5,20,20,Img.player, 10, 1);
	
	self.updatePosition = function(){
		if(self.pressingRight)
			self.x += 10;
		if(self.pressingLeft)
			self.x -= 10;
		if(self.pressingDown)
			self.y += 10;
		if(self.pressingUp)
			self.y -= 10;
				
		//ispositionvalid
		if(self.x < self.width/2)
			self.x = self.width/2;
		if(self.x > WIDTH - self.width/2)
			self.x = WIDTH - self.width/2;
		if(self.y < self.height/2)
			self.y = self.height/2;
		if(self.y > HEIGHT - self.height/2)
			self.y = HEIGHT - self.height/2;
	}
	
	var super_update = self.update;
	self.update = function(){
		super_update();
		if(self.hp <= 0){
			var timeSurvived = Date.now() - timeWhenGameStarted;
			console.log("You lost!" + timeSurvived + " ms.");
			startNewGame();
		}
	}
	
	self.pressingDown = false;
	self.pressingUp = false;
	self.pressingLeft = false;
	self.pressingRight = false;
	return self;

}


Enemy = function Enemy(id, x, y, spdX, spdY,width, height){
	var self = Actor('enemy', id, x, y, spdX, spdY,width, height,Img.enemy,10,1);
	
	var super_update = self.update;
	self.update = function(){
		super_update();
		self.performAttack();
		var isColliding = player.testCollisionEntity(self);
		if(isColliding){
			player.hp--;
		}
	}
	
	enemyList[id] = self;
}
randomlyGenerateEnemy = function(){
	var x = Math.random() * WIDTH;
	var y = Math.random() * HEIGHT;
	var height = 10 + Math.random() * 30;
	var width = 10 + Math.random() * 30;
	var id = Math.random();
	var spdX = 5 + Math.random() * 5;
	var spdY = 5 + Math.random() * 5;
	Enemy(id,x,y,spdX,spdY,width,height);
}

Upgrade = function Upgrade(id, x, y, spdX, spdY,width, height, category, img){
	var self = Entity('upgrade', id, x, y, spdX, spdY,width, height,img);
	self.category = category;
	
	var super_update = self.update();
	var update = function(){
		super_update();
		var isColliding = player.testCollisionEntity(self);
		if(isColliding){
			if(self.category === 'score'){
				score += 1000;
			} else if(self.category === 'attackSpeed') {
				player.attackSpeed += 3;
			}
			delete upgradeList[self.id];
		}
	}
	
	upgradeList[id] = self;
}
randomlyGenerateUpgrade = function(){
	var x = Math.random() * WIDTH;
	var y = Math.random() * HEIGHT;
	var height = 10;
	var width = 10;
	var id = Math.random();
	var spdX = 0;
	var spdY = 0;
	var category;
	var color;
	if(Math.random()<0.5){
		category = 'score';
		img = Img.upgrade1;
	} else {
		category = 'attackSpeed';
		img = Img.upgrade2;
	}
	
	Upgrade(id, x, y, spdX, spdY, width, height, category, img);
}

Bullet = function Bullet(id, x, y, spdX, spdY,width, height){
	var self = Entity('bullet', id, x, y, spdX, spdY,width, height,Img.bullet);
	self.timer = 0;
	
	var super_update = self.update;
	self.update = function(){
		super_update();
		var toRemove = false;
		self.timer++;
		if(self.timer > 100){
			toRemove = true;
		}
		
		for(var key2 in enemyList){
			/*var isColliding = self.testCollisionEntity(enemyList[key2]);
			if(isColliding){
				toRemove = true;
				delete enemyList[key2];
				break;
			}
			*/
		}
		if(toRemove){
			delete bulletList[self.id];
		}
	}
	bulletList[id] = self;
}
generateBullet = function(actor, overwriteAngle){
	var x = actor.x;
	var y = actor.y;
	var height = 10;
	var width = 10;
	var id = Math.random();
	
	var angle = actor.aimAngle;
	if(overwriteAngle !== undefined){
		angle = overwriteAngle;
	}
	var spdX = Math.cos(angle/180*Math.PI) * 5;
	var spdY = Math.sin(angle/180*Math.PI) * 5;
	Bullet(id,x,y,spdX,spdY,width,height);
}
