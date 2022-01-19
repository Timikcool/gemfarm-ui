import React, { useRef } from 'react'
import { PublicKey } from "@solana/web3.js"
import { getNFTMetadataForMany, getNFTsByOwner, INFT } from "@/common/web3/NFTget";
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useEffect } from 'react';
import { initGemBank } from '@/common/gem-bank';
import { getListDiffBasedOnMints, removeManyFromList } from '@/common/util';
import { BN } from '@project-serum/anchor';

export const Vault = (props) => {

    const { wallet, publicKey } = useWallet();
    const { connection } = useConnection();
    //current walet/vault state
    const currentWalletNFTs = useRef<INFT[]>([]);
    const currentVaultNFTs = useRef<INFT[]>([]);
    //selected but not yet moved over in FE
    const selectedWalletNFTs = useRef<INFT[]>([]);
    const selectedVaultNFTs = useRef<INFT[]>([]);
    //moved over in FE but not yet onchain
    const desiredWalletNFTs = useRef<INFT[]>([]);
    const desiredVaultNFTs = useRef<INFT[]>([]);
    //moved over onchain
    const toWalletNFTs = useRef<INFT[]>([]);
    const toVaultNFTs = useRef<INFT[]>([]);

    // --------------------------------------- populate initial nfts

    const populateWalletNFTs = async () => {
        // zero out to begin with
        currentWalletNFTs.current = [];
        selectedWalletNFTs.current = [];
        desiredWalletNFTs.current = [];

        if (wallet) {
            currentWalletNFTs.current = await getNFTsByOwner(
                publicKey!,
                connection
            );
            desiredWalletNFTs.current = [...currentWalletNFTs.current];
        }
    };

    const populateVaultNFTs = async () => {
        // zero out to begin with
        currentVaultNFTs.current = [];
        selectedVaultNFTs.current = [];
        desiredVaultNFTs.current = [];

        const foundGDRs = await gb.fetchAllGdrPDAs(vault.current);
        if (foundGDRs && foundGDRs.length) {
            gdrs.current = foundGDRs;
            console.log(`found a total of ${foundGDRs.length} gdrs`);

            const mints = foundGDRs.map((gdr: any) => {
                return { mint: gdr.account.gemMint };
            });
            currentVaultNFTs.current = await getNFTMetadataForMany(
                mints,
                connection
            );
            desiredVaultNFTs.current = [...currentVaultNFTs.current];
            console.log(
                `populated a total of ${currentVaultNFTs.current.length} vault NFTs`
            );
        }
    };

    const updateVaultState = async () => {
        vaultAcc.current = await gb.fetchVaultAcc(vault.current);
        bank.current = vaultAcc.current.bank;
        vaultLocked.current = vaultAcc.current.locked;
    };

    useEffect(() => {
        const refresh = async () => {
            gb = await initGemBank(connection, wallet!);

            //populate wallet + vault nfts
            await Promise.all([populateWalletNFTs(), populateVaultNFTs()])
        }
        refresh()
    }, [wallet]);

    useEffect(() => {
        const getData = async () => {
            gb = await initGemBank(connection, wallet!);

            //prep vault + bank variables
            vault.current = new PublicKey(props.vault!);
            await updateVaultState();

            //populate wallet + vault nfts
            await Promise.all([populateWalletNFTs(), populateVaultNFTs()]);
        }
        getData();
    }, []);

    // --------------------------------------- moving nfts

    const handleWalletSelected = (e: any) => {
        if (e.selected) {
            selectedWalletNFTs.current.push(e.nft);
        } else {
            const index = selectedWalletNFTs.current.indexOf(e.nft);
            selectedWalletNFTs.current.splice(index, 1);
        }
        props.setSelectedNfts(selectedWalletNFTs.current);
    };

    const handleVaultSelected = (e: any) => {
        if (e.selected) {
            selectedVaultNFTs.current.push(e.nft);
        } else {
            const index = selectedVaultNFTs.current.indexOf(e.nft);
            selectedVaultNFTs.current.splice(index, 1);
        }
    };

    const moveNFTsFE = (moveLeft: boolean) => {
        if (moveLeft) {
            //push selected vault nfts into desired wallet
            desiredWalletNFTs.current.push(...selectedVaultNFTs.current);
            //remove selected vault nfts from desired vault
            removeManyFromList(selectedVaultNFTs.current, desiredVaultNFTs.current);
            //empty selection list
            selectedVaultNFTs.current = [];
        } else {
            //push selected wallet nfts into desired vault
            desiredVaultNFTs.current.push(...selectedWalletNFTs.current);
            //remove selected wallet nfts from desired wallet
            removeManyFromList(selectedWalletNFTs.current, desiredWalletNFTs.current);
            //empty selected walelt
            selectedWalletNFTs.current = [];
        }
    };

    //todo jam into single tx
    const moveNFTsOnChain = async () => {
        for (const nft of toVaultNFTs.current) {
            console.log(nft);
            const creator = new PublicKey(
                //todo currently simply taking the 1st creator
                (nft.onchainMetadata as any).data.creators[0].address
            );
            console.log('creator is', creator.toBase58());
            await depositGem(nft.mint, creator, nft.pubkey!);
        }
        for (const nft of toWalletNFTs.current) {
            await withdrawGem(nft.mint);
        }
        await Promise.all([populateWalletNFTs(), populateVaultNFTs()]);
    };

    //to vault = vault desired - vault current
    useEffect(() => {
        toVaultNFTs.current = getListDiffBasedOnMints(
            desiredVaultNFTs.current,
            currentVaultNFTs.current
        );
        console.log('to vault nfts are', toVaultNFTs.current);
    }, [desiredVaultNFTs])
        ;

    //to wallet = wallet desired - wallet current
    useEffect(() => {
        toWalletNFTs.current = getListDiffBasedOnMints(
            desiredWalletNFTs.current,
            currentWalletNFTs.current
        );
        console.log('to wallet nfts are', toWalletNFTs.current);
    },
        [desiredWalletNFTs]
    );

    // --------------------------------------- gem bank

    let gb: any;
    const bank = useRef<PublicKey>();
    const vault = useRef<PublicKey>();
    const vaultAcc = useRef<any>();
    const gdrs = useRef<PublicKey[]>([]);
    const vaultLocked = useRef<boolean>(false);

    const depositGem = async (
        mint: PublicKey,
        creator: PublicKey,
        source: PublicKey
    ) => {
        const { txSig } = await gb.depositGemWallet(
            bank.current,
            vault.current,
            new BN(1),
            mint,
            source,
            creator
        );
        console.log('deposit done', txSig);
    };

    const withdrawGem = async (mint: PublicKey) => {
        const { txSig } = await gb.withdrawGemWallet(
            bank.current,
            vault.current,
            new BN(1),
            mint
        );
        console.log('withdrawal done', txSig);
    };

    return (
        <div>

        </div>
    )
}
