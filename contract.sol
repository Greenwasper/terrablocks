// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.8.2 <0.9.0;

contract LandContract {

    event LandRegistered(address indexed registerer, string indexed landId, uint256 timestamp, Land land);
    event LandClaimed(address indexed claimerAddress, string indexed landId, uint256 timestamp, Land land);
    event SellerAcknowledged(address indexed ownerAddress, Land land, uint256 timestamp);
    event BuyerAcknowledged(address indexed buyerAddress, Land land, uint256 timestamp);
    event LayerAcknowledged(address indexed layerAddress, address indexed acknowledgerAddress, string indexed landId, Land land, uint256 timestamp);
    event LandTransferred(address indexed from, address indexed to, string indexed landId, Land land, uint256 timestamp);

    address public owner;

    uint private constant LAYERS = 3;

    address[LAYERS] private layerAddresses;

    // modifier onlyOwner() {
    //     require(msg.sender == owner, "Only the contract owner can call this function");
    //     _;
    // }

    bool public layersInitialized;

    modifier onlyOnce() {
        require(!layersInitialized, "Function has already been executed.");
        _;
        layersInitialized = true;
    }

    function msgSender () public view returns (address){
        return msg.sender;
    }

    Land[] private lands;

    constructor(){
        owner = msg.sender;
    }

    function initLayers(address[LAYERS] memory _layers) public onlyOnce {
        layerAddresses = _layers;
    }

    function getLayerAddresses() public view returns (address[LAYERS] memory) {
        return layerAddresses;
    }

    struct Land {
        string id;
        string name;
        address currentOwner; // Current owner
        address owner; // Owner ack, change to address
        address currentBuyer;
        address buyer; // Buyer ack, change to address
        address[LAYERS] acks; // 0 = assembly, 1 = registry, 2 = commission
        uint256[LAYERS] ackTimes;
        string[LAYERS+2] notes; // 3 - buyer notes, 4 - seller notes
        string feature;
        uint256 timestamp;
        uint256 ownerAckTime; // the time owner added ack
        uint256 buyerAckTime; // the time buyer added ack
    }

    function registerLand(
        address _ownerAddress,
        string memory _landId,
        string memory _name,
        string memory _feature,
        address _registerer
    ) public {
        Land memory newLand = Land({
            id: _landId,
            name: _name,
            currentOwner: _ownerAddress,
            owner: _ownerAddress,
            currentBuyer: address(0),
            buyer: address(0),
            acks: [address(0), address(0), address(0)],
            ackTimes: [uint(0), uint(0), uint(0)],
            notes: ["", "", "", "", ""],
            feature: _feature,
            timestamp: block.timestamp,
            ownerAckTime: 0,
            buyerAckTime: 0
        });

        lands.push(newLand);

        emit LandRegistered(_registerer, _landId, block.timestamp, newLand);
    }

    function getAllLands() public view returns (Land[] memory) {
        return lands;
    }

    function claimLand(address _claimerAddress, string memory _landId, string memory _notes) public {
        for (uint i = 0; i < lands.length; i++) {
            if (keccak256(abi.encodePacked(lands[i].id)) == keccak256(abi.encodePacked(_landId))) {

                require(lands[i].currentOwner == address(0), "Cannot claim an owned land");
                require(lands[i].owner == address(0) && lands[i].currentBuyer == address(0) && lands[i].buyer == address(0), "This land has already been claimed");

                lands[i].owner = _claimerAddress;
                lands[i].currentBuyer = _claimerAddress;
                lands[i].buyer = _claimerAddress;
                lands[i].buyerAckTime = block.timestamp;
                lands[i].notes[3] = _notes;

                emit LandClaimed(_claimerAddress, lands[i].id, block.timestamp, lands[i]);
            }
        }
    }

    function buyerAck(address _buyerAddress, string memory _landId, string memory _notes) public {
        for (uint i = 0; i < lands.length; i++) {
            if (keccak256(abi.encodePacked(lands[i].id)) == keccak256(abi.encodePacked(_landId))) {
                require(lands[i].currentBuyer == _buyerAddress, "You are not the agreed buyer for this land");
                require(lands[i].buyer == address(0), "Buyer has already acknowledged");

                lands[i].buyer = _buyerAddress;
                lands[i].buyerAckTime = block.timestamp;
                lands[i].notes[3] = _notes;
                emit BuyerAcknowledged(_buyerAddress, lands[i], block.timestamp);

                break;
            }
        }
    }

    function sellerAck(address _sellerAddress, address _buyerAddress, string memory _landId, string memory _notes) public {
        for (uint i = 0; i < lands.length; i++) {
            if (keccak256(abi.encodePacked(lands[i].id)) == keccak256(abi.encodePacked(_landId))) {
                require(lands[i].currentOwner == _sellerAddress, "You are not the owner of this land");
                require(lands[i].currentBuyer == address(0), "Buyer is already present");
                require(lands[i].owner == address(0), "Owner has already acknowledged");
                lands[i].owner = _sellerAddress;
                lands[i].currentBuyer = _buyerAddress;
                lands[i].ownerAckTime = block.timestamp;
                lands[i].notes[4] = _notes;
                emit SellerAcknowledged(_sellerAddress, lands[i], block.timestamp);

                break;
            }
        }
    }

    function containsZeroAddress(address[3] memory addressArray) public pure returns (bool) {
        for (uint i = 0; i < addressArray.length; i++) {
            if (addressArray[i] == address(0)) {
                return true;
            }
        }
        return false;
    }

    function layerAck(address _layerAddress, address _acknowledgerAddress, string memory _landId, string memory _notes) public {
        for (uint i = 0; i < lands.length; i++) {
            if (keccak256(abi.encodePacked(lands[i].id)) == keccak256(abi.encodePacked(_landId))) {
                bool isLayer = false;

                for(uint j = 0; j < LAYERS; j++){
                    if(_layerAddress == layerAddresses[j]){
                        isLayer = true;
                        lands[i].acks[j] = _layerAddress;
                        lands[i].ackTimes[j] = block.timestamp;
                        lands[i].notes[j] = _notes;
                        emit LayerAcknowledged(_layerAddress, _acknowledgerAddress, lands[i].id, lands[i], block.timestamp);

                        if(j == LAYERS-1){
                            // transfer land

                            // require(lands[i].owner != address(0) && lands[i].buyer != address(0) && lands[i].owner == lands[i].currentOwner && lands[i].buyer == lands[i].currentBuyer && !containsZeroAddress(lands[i].acks), "This land does not contain sufficient acknowledgements");

                            require(!containsZeroAddress(lands[i].acks), "This transaction does not contain sufficient acknowledgements");
                            
                            emit LandTransferred(lands[i].currentOwner, lands[i].currentBuyer, lands[i].id, lands[i], block.timestamp);
                            lands[i].currentOwner = lands[i].currentBuyer;
                            lands[i].currentBuyer = address(0);
                            lands[i].buyer = address(0);
                            lands[i].owner = address(0);
                            lands[i].ownerAckTime = 0;
                            lands[i].buyerAckTime = 0;
                            lands[i].acks = [address(0), address(0), address(0)];
                            lands[i].ackTimes = [uint256(0), uint256(0), uint256(0)];
                            lands[i].notes = ["", "", "", "", ""];
                        }

                        break;
                    }
                }

                require(isLayer, "You are not authorized to execute this transaction");

                break;
            }
        }
    }
}