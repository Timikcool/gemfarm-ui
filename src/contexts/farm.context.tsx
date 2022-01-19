import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import React, { useContext, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js"
import { GemFarm, initGemFarm } from "../common/gem-farm";
import { stringifyPKsAndBNs } from "@/common/gem-common/types";
import { INFT } from "@/common/web3/NFTget";

export interface FraktionContextType {
    fetchFarmer: Function,
    fetchFarm: Function,
    freshStart: Function,
    initFarmer: Function,
    beginStaking: Function,
    endStaking: Function,
    claim: Function,
    addSingleGem: Function,
    addGems: Function,
    setSelectedNFTs: Function
}

export const FarmContext = React.createContext<FraktionContextType>({
    fetchFarmer: () => { },
    fetchFarm: () => { },
    freshStart: () => { },
    initFarmer: () => { },
    beginStaking: () => { },
    endStaking: () => { },
    claim: () => { },
    addSingleGem: () => { },
    addGems: () => { },
    setSelectedNFTs: () => { }
});


export const FarmProvider = ({
    children = null,
    farm = ""
}: {
    children: JSX.Element | null,
    farm: string
}): JSX.Element => {
    const [gf, setGF] = useState<GemFarm>();


    const [farmer, setFarmer] = useState<{ acc: any, state: string | undefined, identity: string | undefined }>();
    const [farmAcc, setFarmAcc] = useState<any>();
    const [rewardsA, setRewardsA] = useState<any>();
    const [rewardsB, setRewardsB] = useState<any>();
    const [selectedNFTs, setSelectedNFTs] = useState<INFT[]>([]);

    const { publicKey, wallet, connected } = useWallet()
    const { connection } = useConnection();

    const fetchFarmer = async () => {
        if (publicKey && gf) {
            const [farmerPDA] = await gf.findFarmerPDA(
                new PublicKey(farm),
                publicKey
            );
            const farmerIdentity = publicKey?.toBase58();
            const farmerAcc = await gf.fetchFarmerAcc(farmerPDA);
            const farmerState = gf.parseFarmerState(farmerAcc);
            setFarmer({ acc: farmerAcc, identity: farmerIdentity, state: farmerState })
            setRewardsA(farmerAcc.rewardA?.accruedReward
                .sub(farmerAcc.rewardA.paidOutReward)
                .toString());
            setRewardsB(farmerAcc.rewardB.accruedReward
                .sub(farmerAcc.rewardB.paidOutReward)
                .toString());
        }


        // console.log(
        //     `farmer found at ${farmerIdentity.value}:`,
        //     stringifyPKsAndBNs(farmerAcc.value)
        // );
    }

    const fetchFarm = async () => {
        if (gf) {
            setFarmAcc(await gf.fetchFarmAcc(new PublicKey(farm)));
            console.log(
                `farm found at ${farm}:`,
                stringifyPKsAndBNs(farmAcc)
            );
        }
    };

    const freshStart = async () => {
        if (wallet && connected) {
            const gf = await initGemFarm(connection, wallet);
            const farmerIdentity = publicKey?.toBase58();

            //reset stuff
            const farmAcc = undefined;
            const farmerAcc = undefined;
            const farmerState = undefined;
            const availableA = undefined;
            const availableB = undefined;

            setFarmer({ acc: farmerAcc, state: farmerState, identity: farmerIdentity })
            setRewardsA(availableA);
            setRewardsB(availableB);
            setFarmAcc(farmAcc)

            try {
                await fetchFarm();
                await fetchFarmer();
            } catch (e) {
                console.log(`farm with PK ${farm} not found :(`);
            }
        }
    };

    useEffect(() => {
        if (publicKey && connected) {
            freshStart();
        }
    }, [publicKey, connected])

    const initFarmer = async () => {
        if (gf) {
            await gf.initFarmerWallet(new PublicKey(farm!));
            await fetchFarmer();
        }
    };

    // --------------------------------------- staking
    const beginStaking = async () => {
        if (gf) {
            await gf.stakeWallet(new PublicKey(farm!));
            await fetchFarmer();
            setSelectedNFTs([])
        }
    };

    const endStaking = async () => {
        if (gf) {
            await gf.unstakeWallet(new PublicKey(farm!));
            await fetchFarmer();
            setSelectedNFTs([])
        }
    };

    const claim = async () => {
        if (gf) {
            await gf.claimWallet(
                new PublicKey(farm),
                new PublicKey(farmAcc.rewardA.rewardMint!),
                new PublicKey(farmAcc.rewardB.rewardMint!)
            );
            await fetchFarmer();
        }
    };


    const addSingleGem = async (
        gemMint: PublicKey,
        gemSource: PublicKey,
        creator: PublicKey
    ) => {
        if (gf) {
            await gf.flashDepositWallet(
                new PublicKey(farm!),
                '1',
                gemMint,
                gemSource,
                creator
            );
            await fetchFarmer();
        }

    };

    const addGems = async () => {
        await Promise.all(
            selectedNFTs.map((nft) => {
                const creator = new PublicKey(
                    //todo currently simply taking the 1st creator
                    (nft.onchainMetadata as any).data.creators[0].address
                );
                console.log('creator is', creator.toBase58());

                addSingleGem(nft.mint, nft.pubkey!, creator);
            })
        );
        console.log(
            `added another ${selectedNFTs.length} gems into staking vault`
        );
    };

    return <FarmContext.Provider value={{
        fetchFarmer,
        fetchFarm,
        freshStart,
        initFarmer,
        beginStaking,
        endStaking,
        claim,
        addSingleGem,
        addGems,
        setSelectedNFTs
    }}>{children}</FarmContext.Provider>
}

export const useFarm = () => {
    const {
        fetchFarmer,
        fetchFarm,
        freshStart,
        initFarmer,
        beginStaking,
        endStaking,
        claim,
        addSingleGem,
        addGems,
        setSelectedNFTs
    } = useContext(FarmContext);
    return {
        fetchFarmer,
        fetchFarm,
        freshStart,
        initFarmer,
        beginStaking,
        endStaking,
        claim,
        addSingleGem,
        addGems,
        setSelectedNFTs
    };
};
