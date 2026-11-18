// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {StreakVault} from "../src/StreakVault.sol";
import {MockYieldSource} from "../src/MockYieldSource.sol";
import {YieldDistributor} from "../src/YieldDistributor.sol";
import {Gems} from "../src/Gems.sol";
import {FreezeGift} from "../src/FreezeGift.sol";
import {SavingCircle} from "../src/SavingCircle.sol";
import {MentorHub} from "../src/MentorHub.sol";
import {CelebrationPool} from "../src/CelebrationPool.sol";
import {Web3Mail} from "../src/Web3Mail.sol";
import {GuildWars} from "../src/GuildWars.sol";
import {PrizeLinkedSavings} from "../src/PrizeLinkedSavings.sol";
import {SavingsBond} from "../src/SavingsBond.sol";
import {PaycheckSplitter} from "../src/PaycheckSplitter.sol";
import {TermLock} from "../src/TermLock.sol";
import {PredictionBox} from "../src/PredictionBox.sol";
import {DailyCheckIn} from "../src/DailyCheckIn.sol";
import {PetCompanion} from "../src/PetCompanion.sol";
import {KingOfTheHill} from "../src/KingOfTheHill.sol";
import {TimeCapsule} from "../src/TimeCapsule.sol";
import {GuardianRecovery} from "../src/GuardianRecovery.sol";
import {GemStaking} from "../src/GemStaking.sol";
import {TreasuryDividend} from "../src/TreasuryDividend.sol";
import {EmergencyHatch} from "../src/EmergencyHatch.sol";
import {StampsCollection} from "../src/StampsCollection.sol";
import {VaultCredit} from "../src/VaultCredit.sol";
import {GoalTemplates} from "../src/GoalTemplates.sol";
import {FaucetDrip} from "../src/FaucetDrip.sol";
import {SavingsJournal} from "../src/SavingsJournal.sol";
import {FeeRebate} from "../src/FeeRebate.sol";
import {CharityPot} from "../src/CharityPot.sol";
import {SpendingLimit} from "../src/SpendingLimit.sol";

/// @notice Deploy lô contract mở rộng thứ 3 (Tính năng 51-130) lên chain đã có deployment.
/// Đọc địa chỉ lõi từ deployments/<chainId>.json (chạy DeployAll trước), gộp địa chỉ mới vào json.
contract DeployExtensions is Script {
    function run() external {
        string memory path = string.concat(vm.projectRoot(), "/deployments/", vm.toString(block.chainid), ".json");
        string memory json = vm.readFile(path);

        MockUSDC token = MockUSDC(vm.parseJsonAddress(json, ".token"));
        StreakVault vault = StreakVault(vm.parseJsonAddress(json, ".vault"));
        MockYieldSource source = MockYieldSource(vm.parseJsonAddress(json, ".yieldSource"));
        YieldDistributor distributor = YieldDistributor(vm.parseJsonAddress(json, ".distributor"));
        Gems gems = Gems(vm.parseJsonAddress(json, ".gems"));

        vm.startBroadcast();
        FreezeGift freezeGift = new FreezeGift(vault, token);
        SavingCircle circle = new SavingCircle(vault, token);
        MentorHub mentorHub = new MentorHub(vault, token);
        CelebrationPool celebration = new CelebrationPool(vault, token);
        Web3Mail mail = new Web3Mail(token);
        GuildWars guildWars = new GuildWars(vault, token);
        PrizeLinkedSavings pls = new PrizeLinkedSavings(vault, distributor, token);
        SavingsBond bond = new SavingsBond(vault, token);
        PaycheckSplitter splitter = new PaycheckSplitter(vault, token);
        TermLock termLock = new TermLock(vault, token);
        PredictionBox prediction = new PredictionBox(vault, source, token);
        DailyCheckIn checkIn = new DailyCheckIn(gems);
        PetCompanion pet = new PetCompanion(vault, gems, vm.parseJsonAddress(json, ".treasury"), "https://example.com/pet/{id}.json");
        KingOfTheHill hill = new KingOfTheHill(vault, token);
        TimeCapsule capsule = new TimeCapsule(vault, token);
        GuardianRecovery recovery = new GuardianRecovery();
        GemStaking staking = new GemStaking(gems);
        TreasuryDividend dividend = new TreasuryDividend(gems, token);
        EmergencyHatch hatch = new EmergencyHatch(token);
        StampsCollection stamps = new StampsCollection(vault, token, "https://example.com/stamps/{id}.json");
        VaultCredit credit = new VaultCredit(vault, token);
        GoalTemplates templates = new GoalTemplates(vault, gems);
        FaucetDrip faucet = new FaucetDrip(vault, token);
        SavingsJournal journal = new SavingsJournal(vault);
        FeeRebate rebate = new FeeRebate(vault, token, gems);
        CharityPot charity = new CharityPot(token);
        SpendingLimit spendLimit = new SpendingLimit(vault, token);

        // Wiring quyền
        vault.setOperator(address(freezeGift), true);
        vault.setOperator(address(faucet), true);
        vault.setOperator(address(templates), true);
        gems.grantRole(gems.MINTER_ROLE(), address(checkIn));
        gems.grantRole(gems.MINTER_ROLE(), address(rebate));
        gems.grantRole(gems.MINTER_ROLE(), address(staking));
        gems.grantRole(gems.MINTER_ROLE(), address(templates));
        vm.stopBroadcast();

        console2.log("FreezeGift      ", address(freezeGift));
        console2.log("SavingCircle    ", address(circle));
        console2.log("MentorHub       ", address(mentorHub));
        console2.log("CelebrationPool ", address(celebration));
        console2.log("Web3Mail        ", address(mail));
        console2.log("GuildWars       ", address(guildWars));
        console2.log("PrizeLinked     ", address(pls));
        console2.log("SavingsBond     ", address(bond));
        console2.log("PaycheckSplitter", address(splitter));
        console2.log("TermLock        ", address(termLock));
        console2.log("PredictionBox   ", address(prediction));
        console2.log("DailyCheckIn    ", address(checkIn));
        console2.log("PetCompanion    ", address(pet));
        console2.log("KingOfTheHill   ", address(hill));
        console2.log("TimeCapsule     ", address(capsule));
        console2.log("GuardianRecovery", address(recovery));
        console2.log("GemStaking      ", address(staking));
        console2.log("TreasuryDividend", address(dividend));
        console2.log("EmergencyHatch  ", address(hatch));
        console2.log("StampsCollection", address(stamps));
        console2.log("VaultCredit     ", address(credit));
        console2.log("GoalTemplates   ", address(templates));
        console2.log("FaucetDrip      ", address(faucet));
        console2.log("SavingsJournal  ", address(journal));
        console2.log("FeeRebate       ", address(rebate));
        console2.log("CharityPot      ", address(charity));
        console2.log("SpendingLimit   ", address(spendLimit));

        _mergeDeployment(
            path,
            json,
            address(freezeGift),
            address(circle),
            address(mentorHub),
            address(celebration),
            address(mail),
            address(guildWars),
            address(pls),
            address(bond),
            address(splitter),
            address(termLock),
            address(prediction),
            address(checkIn),
            address(pet),
            address(hill),
            address(capsule),
            address(recovery),
            address(staking),
            address(dividend),
            address(hatch),
            address(stamps),
            address(credit),
            address(templates),
            address(faucet),
            address(journal),
            address(rebate),
            address(charity),
            address(spendLimit)
        );
    }

    /// @dev Gộp địa chỉ mới vào file deployment hiện có (giữ nguyên các trường cũ).
    function _mergeDeployment(
        string memory path,
        string memory oldJson,
        address freezeGift,
        address circle,
        address mentorHub,
        address celebration,
        address mail,
        address guildWars,
        address pls,
        address bond,
        address splitter,
        address termLock,
        address prediction,
        address checkIn,
        address pet,
        address hill,
        address capsule,
        address recovery,
        address staking,
        address dividend,
        address hatch,
        address stamps,
        address credit,
        address templates,
        address faucet,
        address journal,
        address rebate,
        address charity,
        address spendLimit
    ) internal {
        string memory k = "deployment";
        // Sao chép các trường cũ sang object mới
        vm.serializeUint(k, "chainId", vm.parseJsonUint(oldJson, ".chainId"));
        vm.serializeUint(k, "deployBlock", block.number);
        vm.serializeUint(k, "startAt", vm.parseJsonUint(oldJson, ".startAt"));
        vm.serializeUint(k, "epochSeconds", vm.parseJsonUint(oldJson, ".epochSeconds"));
        vm.serializeAddress(k, "deployer", vm.parseJsonAddress(oldJson, ".deployer"));
        vm.serializeAddress(k, "token", vm.parseJsonAddress(oldJson, ".token"));
        vm.serializeAddress(k, "vault", vm.parseJsonAddress(oldJson, ".vault"));
        vm.serializeAddress(k, "yieldSource", vm.parseJsonAddress(oldJson, ".yieldSource"));
        vm.serializeAddress(k, "distributor", vm.parseJsonAddress(oldJson, ".distributor"));
        vm.serializeAddress(k, "treasury", vm.parseJsonAddress(oldJson, ".treasury"));
        vm.serializeAddress(k, "autoSaver", vm.parseJsonAddress(oldJson, ".autoSaver"));
        vm.serializeAddress(k, "groups", vm.parseJsonAddress(oldJson, ".groups"));
        vm.serializeAddress(k, "nft", vm.parseJsonAddress(oldJson, ".nft"));
        vm.serializeAddress(k, "challenges", vm.parseJsonAddress(oldJson, ".challenges"));
        vm.serializeAddress(k, "wheel", vm.parseJsonAddress(oldJson, ".wheel"));
        vm.serializeAddress(k, "goal", vm.parseJsonAddress(oldJson, ".goal"));
        vm.serializeAddress(k, "leaderboard", vm.parseJsonAddress(oldJson, ".leaderboard"));
        vm.serializeAddress(k, "reminders", vm.parseJsonAddress(oldJson, ".reminders"));
        vm.serializeAddress(k, "gems", vm.parseJsonAddress(oldJson, ".gems"));
        vm.serializeAddress(k, "missions", vm.parseJsonAddress(oldJson, ".missions"));
        vm.serializeAddress(k, "gemShop", vm.parseJsonAddress(oldJson, ".gemShop"));
        // Trường mới
        vm.serializeAddress(k, "freezeGift", freezeGift);
        vm.serializeAddress(k, "savingCircle", circle);
        vm.serializeAddress(k, "mentorHub", mentorHub);
        vm.serializeAddress(k, "celebrationPool", celebration);
        vm.serializeAddress(k, "web3Mail", mail);
        vm.serializeAddress(k, "guildWars", guildWars);
        vm.serializeAddress(k, "prizeLinked", pls);
        vm.serializeAddress(k, "savingsBond", bond);
        vm.serializeAddress(k, "paycheckSplitter", splitter);
        vm.serializeAddress(k, "termLock", termLock);
        vm.serializeAddress(k, "predictionBox", prediction);
        vm.serializeAddress(k, "dailyCheckIn", checkIn);
        vm.serializeAddress(k, "petCompanion", pet);
        vm.serializeAddress(k, "kingOfTheHill", hill);
        vm.serializeAddress(k, "timeCapsule", capsule);
        vm.serializeAddress(k, "guardianRecovery", recovery);
        vm.serializeAddress(k, "gemStaking", staking);
        vm.serializeAddress(k, "treasuryDividend", dividend);
        vm.serializeAddress(k, "emergencyHatch", hatch);
        vm.serializeAddress(k, "stampsCollection", stamps);
        vm.serializeAddress(k, "vaultCredit", credit);
        vm.serializeAddress(k, "goalTemplates", templates);
        vm.serializeAddress(k, "faucetDrip", faucet);
        vm.serializeAddress(k, "savingsJournal", journal);
        vm.serializeAddress(k, "feeRebate", rebate);
        vm.serializeAddress(k, "charityPot", charity);
        string memory out = vm.serializeAddress(k, "spendingLimit", spendLimit);
        vm.writeJson(out, path);
        console2.log("Merged deployment ->", path);
    }
}
