SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

CREATE SCHEMA IF NOT EXISTS `medusa` DEFAULT CHARACTER SET utf8 COLLATE utf8_general_ci ;
USE `medusa` ;

-- -----------------------------------------------------
-- Table `medusa`.`G_Connected_Guilds`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`G_Connected_Guilds` (
  `guild_id` BIGINT UNSIGNED NOT NULL ,
  PRIMARY KEY (`guild_id`) ,
  UNIQUE INDEX `guild_id_UNIQUE` (`guild_id` ASC) )
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`G_Auto_Role`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`G_Auto_Role` (
  `guild_id` BIGINT UNSIGNED NOT NULL ,
  `role_id` BIGINT UNSIGNED NOT NULL ,
  PRIMARY KEY (`guild_id`) ,
  CONSTRAINT `AR_CG_guild_id`
    FOREIGN KEY (`guild_id` )
    REFERENCES `medusa`.`G_Connected_Guilds` (`guild_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`G_Temp_Channels`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`G_Temp_Channels` (
  `guild_id` BIGINT UNSIGNED NOT NULL ,
  `voice_channel_id` BIGINT UNSIGNED NOT NULL ,
  PRIMARY KEY (`voice_channel_id`, `guild_id`) ,
  UNIQUE INDEX `voice_channel_id_UNIQUE` (`voice_channel_id` ASC) ,
  CONSTRAINT `TC_CG_guild_id`
    FOREIGN KEY (`guild_id` )
    REFERENCES `medusa`.`G_Connected_Guilds` (`guild_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`U_Connected_Users`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`U_Connected_Users` (
  `user_id` BIGINT UNSIGNED NOT NULL ,
  PRIMARY KEY (`user_id`) ,
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) )
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`G_Prefix`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`G_Prefix` (
  `guild_id` BIGINT UNSIGNED NOT NULL ,
  `prefix` VARCHAR(10) NOT NULL DEFAULT '=' ,
  PRIMARY KEY (`guild_id`) ,
  UNIQUE INDEX `guild_id_UNIQUE` (`guild_id` ASC) ,
  CONSTRAINT `P_CG_guild_id`
    FOREIGN KEY (`guild_id` )
    REFERENCES `medusa`.`G_Connected_Guilds` (`guild_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`U_SB_Statistics`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`U_SB_Statistics` (
  `user_id` BIGINT UNSIGNED NOT NULL ,
  `pointbreaker_wins` INT NOT NULL DEFAULT 0 ,
  `speedbreaker_wins` INT NOT NULL DEFAULT 0 ,
  `season` INT UNSIGNED NOT NULL DEFAULT 1 ,
  PRIMARY KEY (`user_id`) ,
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) ,
  CONSTRAINT `SBS_CU_user_id`
    FOREIGN KEY (`user_id` )
    REFERENCES `medusa`.`U_Connected_Users` (`user_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`U_Bungie_Account`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`U_Bungie_Account` (
  `user_id` BIGINT UNSIGNED NOT NULL ,
  `bungie_id` BIGINT UNSIGNED NOT NULL ,
  `time_added` TIMESTAMP NOT NULL ,
  PRIMARY KEY (`user_id`) ,
  UNIQUE INDEX `bungie_id_UNIQUE` (`bungie_id` ASC) ,
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) ,
  CONSTRAINT `BA_CU_user_id`
    FOREIGN KEY (`user_id` )
    REFERENCES `medusa`.`U_Connected_Users` (`user_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`U_Destiny_Profile`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`U_Destiny_Profile` (
  `destiny_id` BIGINT UNSIGNED NOT NULL ,
  `bungie_id` BIGINT UNSIGNED NOT NULL ,
  `membership_id` INT UNSIGNED NOT NULL ,
  PRIMARY KEY (`destiny_id`) ,
  UNIQUE INDEX `destiny_id_UNIQUE` (`destiny_id` ASC) ,
  CONSTRAINT `DP_BA_bungie_id`
    FOREIGN KEY (`bungie_id` )
    REFERENCES `medusa`.`U_Bungie_Account` (`bungie_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`U_Experience`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`U_Experience` (
  `user_id` BIGINT UNSIGNED NOT NULL ,
  `xp` INT UNSIGNED NOT NULL DEFAULT 0 ,
  `level` INT UNSIGNED NOT NULL DEFAULT 0 ,
  `reset` INT UNSIGNED NOT NULL DEFAULT 0 ,
  `connected` TINYINT NOT NULL DEFAULT 1 ,
  PRIMARY KEY (`user_id`) ,
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) ,
  CONSTRAINT `E_CU_user_id`
    FOREIGN KEY (`user_id` )
    REFERENCES `medusa`.`U_Connected_Users` (`user_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`SB_Submissions`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`SB_Submissions` (
  `pgcr_id` INT NOT NULL ,
  `score` VARCHAR(45) NOT NULL ,
  `time` VARCHAR(45) NOT NULL ,
  `date_completed` TIMESTAMP NOT NULL ,
  PRIMARY KEY (`pgcr_id`) )
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`SB_Winners`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`SB_Winners` (
  `week` INT UNSIGNED NOT NULL ,
  `type` VARCHAR(45) NOT NULL ,
  `pgcr_id` INT NOT NULL ,
  PRIMARY KEY (`week`, `type`) ,
  INDEX `SB_W_SB_S_pgcr_id_idx` (`pgcr_id` ASC) ,
  CONSTRAINT `SB_W_SB_S_pgcr_id`
    FOREIGN KEY (`pgcr_id` )
    REFERENCES `medusa`.`SB_Submissions` (`pgcr_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`G_Welcome_Channel`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`G_Welcome_Channel` (
  `guild_id` BIGINT UNSIGNED NOT NULL ,
  `text_channel_id` BIGINT(20) UNSIGNED NOT NULL ,
  PRIMARY KEY (`guild_id`) ,
  UNIQUE INDEX `guild_id_UNIQUE` (`guild_id` ASC) ,
  CONSTRAINT `WC_CG_guild_id`
    FOREIGN KEY (`guild_id` )
    REFERENCES `medusa`.`G_Connected_Guilds` (`guild_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`G_Event_Log_Channel`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`G_Event_Log_Channel` (
  `guild_id` BIGINT UNSIGNED NOT NULL ,
  `text_channel_id` BIGINT NOT NULL ,
  PRIMARY KEY (`guild_id`) ,
  CONSTRAINT `ELC_CG_guild_id`
    FOREIGN KEY (`guild_id` )
    REFERENCES `medusa`.`G_Connected_Guilds` (`guild_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`G_Reaction_Roles`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`G_Reaction_Roles` (
  `guild_id` BIGINT UNSIGNED NOT NULL ,
  `channel_id` BIGINT UNSIGNED NOT NULL ,
  `message_id` BIGINT UNSIGNED NOT NULL ,
  `role_id` BIGINT UNSIGNED NOT NULL ,
  `reaction_id` BIGINT UNSIGNED NULL ,
  `reaction_name` VARCHAR(255) CHARACTER SET 'utf8mb4' NOT NULL ,
  `reaction_animated` TINYINT NOT NULL DEFAULT 0 ,
  INDEX `RR_CG_guild_id_idx` (`guild_id` ASC) ,
  CONSTRAINT `RR_CG_guild_id`
    FOREIGN KEY (`guild_id` )
    REFERENCES `medusa`.`G_Connected_Guilds` (`guild_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`U_M_Clan`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`U_M_Clan` (
  `user_id` BIGINT UNSIGNED NOT NULL ,
  `breaker` TINYINT NOT NULL DEFAULT 0 ,
  `original` TINYINT NOT NULL DEFAULT 0 ,
  `pointbreaker` TINYINT NOT NULL DEFAULT 0 ,
  `pointbreaker_v` TINYINT NOT NULL DEFAULT 0 ,
  `speedbreaker` TINYINT NOT NULL DEFAULT 0 ,
  `speedbreaker_v` TINYINT NOT NULL DEFAULT 0 ,
  `legend` TINYINT NOT NULL DEFAULT 0 ,
  `legend_v` TINYINT NOT NULL DEFAULT 0 ,
  `hero_among_guardians` TINYINT NOT NULL DEFAULT 0 ,
  PRIMARY KEY (`user_id`) ,
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) ,
  CONSTRAINT `M_CLAN_CU_user_id`
    FOREIGN KEY (`user_id` )
    REFERENCES `medusa`.`U_Connected_Users` (`user_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`U_M_Pve`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`U_M_Pve` (
  `user_id` BIGINT UNSIGNED NOT NULL ,
  `flawless_hunter` TINYINT NOT NULL DEFAULT 0 ,
  `throne_breaker` TINYINT NOT NULL DEFAULT 0 ,
  `hammer_of_sol` TINYINT NOT NULL DEFAULT 0 ,
  `wrath_of_sol` TINYINT NOT NULL DEFAULT 0 ,
  `blink` TINYINT NOT NULL DEFAULT 0 ,
  `blink_master` TINYINT NOT NULL DEFAULT 0 ,
  PRIMARY KEY (`user_id`) ,
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) ,
  CONSTRAINT `M_PVE_CU_user_id`
    FOREIGN KEY (`user_id` )
    REFERENCES `medusa`.`U_Connected_Users` (`user_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`U_M_Seals`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`U_M_Seals` (
  `user_id` BIGINT UNSIGNED NOT NULL ,
  `wayfarer` TINYINT NOT NULL ,
  `dredgen` TINYINT NOT NULL ,
  `rivensbane` TINYINT NOT NULL ,
  `cursebreaker` TINYINT NOT NULL DEFAULT 0 ,
  `unbroken` TINYINT NOT NULL DEFAULT 0 ,
  `chronicler` TINYINT NOT NULL DEFAULT 0 ,
  `blacksmith` TINYINT NOT NULL DEFAULT 0 ,
  `reckoner` TINYINT NOT NULL DEFAULT 0 ,
  `shadow` TINYINT NOT NULL DEFAULT 0 ,
  PRIMARY KEY (`user_id`) ,
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) ,
  CONSTRAINT `M_SEALS_CU_user_id`
    FOREIGN KEY (`user_id` )
    REFERENCES `medusa`.`U_Connected_Users` (`user_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`U_M_Pvp`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`U_M_Pvp` (
  `user_id` BIGINT UNSIGNED NOT NULL ,
  `broadsword` TINYINT NOT NULL DEFAULT 0 ,
  `luna` TINYINT NOT NULL DEFAULT 0 ,
  `not_forgotten` TINYINT NOT NULL DEFAULT 0 ,
  `mountain_top` TINYINT NOT NULL DEFAULT 0 ,
  `shaxx_proud` TINYINT NOT NULL DEFAULT 0 ,
  PRIMARY KEY (`user_id`) ,
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) ,
  CONSTRAINT `M_PVP_CU_user_id`
    FOREIGN KEY (`user_id` )
    REFERENCES `medusa`.`U_Connected_Users` (`user_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`U_M_Event`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`U_M_Event` (
  `user_id` BIGINT UNSIGNED NOT NULL ,
  `dawning_2018` TINYINT NOT NULL DEFAULT 0 ,
  PRIMARY KEY (`user_id`) ,
  UNIQUE INDEX `user_id_UNIQUE` (`user_id` ASC) ,
  CONSTRAINT `M_EVENT_CU_user_id`
    FOREIGN KEY (`user_id` )
    REFERENCES `medusa`.`U_Connected_Users` (`user_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `medusa`.`G_Master_Temp_Channels`
-- -----------------------------------------------------
CREATE  TABLE IF NOT EXISTS `medusa`.`G_Master_Temp_Channels` (
  `guild_id` BIGINT UNSIGNED NOT NULL ,
  `voice_channel_id` BIGINT UNSIGNED NOT NULL ,
  PRIMARY KEY (`guild_id`, `voice_channel_id`) ,
  UNIQUE INDEX `voice_channel_id_UNIQUE` (`voice_channel_id` ASC) ,
  CONSTRAINT `MTC_CG_guild_id`
    FOREIGN KEY (`guild_id` )
    REFERENCES `medusa`.`G_Connected_Guilds` (`guild_id` )
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;

USE `medusa` ;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
